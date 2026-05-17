'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getAuthUser, syncUser } from './userActions'

async function requireUserId() {
  // Writes touch FKs into User — must guarantee the row exists.
  const user = await syncUser()
  if (!user) throw new Error('Unauthorized')
  return user.id
}

// True iff `listId` belongs to a project the user created or is a member of.
async function userCanAccessList(listId: string, userId: string) {
  const list = await prisma.boardList.findFirst({
    where: {
      id: listId,
      project: {
        OR: [
          { userId },
          { members: { some: { userId } } },
        ],
      },
    },
    select: { id: true },
  })
  return !!list
}

async function loadTaskForUser(taskId: string, userId: string) {
  return prisma.task.findFirst({
    where: {
      id: taskId,
      list: {
        project: {
          OR: [
            { userId },
            { members: { some: { userId } } },
          ],
        },
      },
    },
    select: { id: true, listId: true },
  })
}

const TASK_INCLUDE = { creator: true, assignee: true } as const

// `listId` may be either a real BoardList id, or one of the "virtual" sentinels
// used by the dashboard widgets:
//   - "recent_assignments": tasks assigned to the current user (newest first)
//   - "all_tasks":          tasks created by or assigned to the current user
export async function getTasks(listId: string) {
  const user = await getAuthUser()
  if (!user) return []

  if (listId === 'recent_assignments') {
    return prisma.task.findMany({
      where: { assigneeId: user.id },
      include: TASK_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
  }

  if (listId === 'all_tasks') {
    return prisma.task.findMany({
      where: {
        OR: [{ userId: user.id }, { assigneeId: user.id }],
      },
      include: TASK_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  }

  if (!(await userCanAccessList(listId, user.id))) return []

  return prisma.task.findMany({
    where: { listId },
    include: TASK_INCLUDE,
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  })
}

// Quick-task helper for the dashboard: drops a new task into the project's
// "todo" board list (first list named like to-do/todo, falling back to the
// list at position 0) and assigns it to the current user.
export async function createMyTaskInProject(title: string, projectId: string) {
  const userId = await requireUserId()

  const lists = await prisma.boardList.findMany({
    where: {
      projectId,
      project: {
        OR: [
          { userId },
          { members: { some: { id: userId } } },
        ],
      },
    },
    orderBy: { position: 'asc' },
    select: { id: true, name: true, position: true },
  })

  if (lists.length === 0) {
    throw new Error('Project has no board lists')
  }

  const todoList =
    lists.find((l) => /^to[- ]?do$/i.test(l.name.trim())) ?? lists[0]

  const last = await prisma.task.findFirst({
    where: { listId: todoList.id },
    orderBy: { position: 'desc' },
    select: { position: true },
  })

  const task = await prisma.task.create({
    data: {
      title,
      userId,
      listId: todoList.id,
      assigneeId: userId,
      position: (last?.position ?? -1) + 1,
    },
    include: TASK_INCLUDE,
  })

  revalidatePath('/')
  return task
}

export async function createTask(title: string, listId: string, assigneeId?: string) {
  const userId = await requireUserId()

  if (listId === 'recent_assignments' || listId === 'all_tasks') {
    throw new Error('Cannot create tasks in a virtual list')
  }

  if (!(await userCanAccessList(listId, userId))) {
    throw new Error('Not authorized for this list')
  }

  const last = await prisma.task.findFirst({
    where: { listId },
    orderBy: { position: 'desc' },
    select: { position: true },
  })

  const task = await prisma.task.create({
    data: {
      title,
      userId,
      listId,
      assigneeId,
      position: (last?.position ?? -1) + 1,
    },
    include: TASK_INCLUDE,
  })

  revalidatePath('/')
  return task
}

export async function updateTask(taskId: string, data: {
  title?: string
  assigneeId?: string | null
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE'
  description?: string | null
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  type?: 'TASK' | 'STORY' | 'BUG'
  startDate?: Date | null
  endDate?: Date | null
}) {
  const userId = await requireUserId()

  const existing = await loadTaskForUser(taskId, userId)
  if (!existing) throw new Error('Task not found')

  const task = await prisma.task.update({
    where: { id: taskId },
    data,
    include: TASK_INCLUDE,
  })

  revalidatePath('/')
  return task
}

export async function moveTask(
  taskId: string,
  targetListId: string,
  targetIndex: number,
) {
  const userId = await requireUserId()

  const existing = await loadTaskForUser(taskId, userId)
  if (!existing) throw new Error('Task not found')
  if (!(await userCanAccessList(targetListId, userId))) {
    throw new Error('Not authorized for target list')
  }

  const sourceListId = existing.listId

  await prisma.$transaction(async (tx) => {
    if (sourceListId === targetListId) {
      const items = await tx.task.findMany({
        where: { listId: targetListId },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        select: { id: true },
      })
      const without = items.filter((t) => t.id !== taskId)
      const clamped = Math.max(0, Math.min(targetIndex, without.length))
      const next = [
        ...without.slice(0, clamped),
        { id: taskId },
        ...without.slice(clamped),
      ]
      await Promise.all(
        next.map((t, i) =>
          tx.task.update({ where: { id: t.id }, data: { position: i } }),
        ),
      )
    } else {
      const targetItems = await tx.task.findMany({
        where: { listId: targetListId },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        select: { id: true },
      })
      const clamped = Math.max(0, Math.min(targetIndex, targetItems.length))
      const nextTarget = [
        ...targetItems.slice(0, clamped).map((t) => t.id),
        taskId,
        ...targetItems.slice(clamped).map((t) => t.id),
      ]

      await tx.task.update({
        where: { id: taskId },
        data: { listId: targetListId },
      })

      await Promise.all(
        nextTarget.map((id, i) =>
          tx.task.update({ where: { id }, data: { position: i } }),
        ),
      )

      const sourceItems = await tx.task.findMany({
        where: { listId: sourceListId },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        select: { id: true },
      })
      await Promise.all(
        sourceItems.map((t, i) =>
          tx.task.update({ where: { id: t.id }, data: { position: i } }),
        ),
      )
    }
  })

  revalidatePath('/')
}

export async function deleteTask(taskId: string) {
  const userId = await requireUserId()
  const existing = await loadTaskForUser(taskId, userId)
  if (!existing) return
  await prisma.task.delete({ where: { id: taskId } })
  revalidatePath('/')
}
