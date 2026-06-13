import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { NotificationsService } from './notifications.service'
import { PrismaService } from '../prisma/prisma.service'
import webpush from 'web-push'

jest.mock('web-push', () => ({
  __esModule: true,
  default: {
    setVapidDetails: jest.fn(),
    sendNotification: jest.fn().mockResolvedValue({}),
  },
}))

const mockPrisma = {
  pushSubscription: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
  },
}

const mockConfig = {
  get: jest.fn((key: string, fallback = '') => {
    const env: Record<string, string> = {
      VAPID_PUBLIC_KEY: 'test-pub',
      VAPID_PRIVATE_KEY: 'test-priv',
      VAPID_SUBJECT: 'mailto:test@example.com',
    }
    return env[key] ?? fallback
  }),
}

describe('NotificationsService', () => {
  let service: NotificationsService

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile()
    service = module.get(NotificationsService)
    service.onModuleInit()
  })

  it('calls setVapidDetails on init when keys are present', () => {
    expect(webpush.setVapidDetails).toHaveBeenCalledWith(
      'mailto:test@example.com',
      'test-pub',
      'test-priv',
    )
  })

  it('returns the VAPID public key', () => {
    expect(service.getPublicKey()).toBe('test-pub')
  })

  it('subscribe upserts a push subscription', async () => {
    mockPrisma.pushSubscription.upsert.mockResolvedValue({ id: 'sub-1' })
    const dto = { endpoint: 'https://push.example.com/sub1', keys: { p256dh: 'abc', auth: 'xyz' } }
    const result = await service.subscribe('staff-1', dto)
    expect(mockPrisma.pushSubscription.upsert).toHaveBeenCalledWith({
      where: { endpoint: dto.endpoint },
      create: { staffId: 'staff-1', endpoint: dto.endpoint, p256dh: 'abc', auth: 'xyz' },
      update: { staffId: 'staff-1', p256dh: 'abc', auth: 'xyz' },
    })
    expect(result).toEqual({ id: 'sub-1' })
  })

  it('unsubscribe deletes the subscription by endpoint', async () => {
    mockPrisma.pushSubscription.deleteMany.mockResolvedValue({ count: 1 })
    await service.unsubscribe('https://push.example.com/sub1')
    expect(mockPrisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { endpoint: 'https://push.example.com/sub1' },
    })
  })

  it('sendToRole sends to all subscriptions for the role', async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([
      { endpoint: 'https://e1.example.com', p256dh: 'p1', auth: 'a1' },
      { endpoint: 'https://e2.example.com', p256dh: 'p2', auth: 'a2' },
    ])
    await service.sendToRole('kitchen', { title: 'New Order', body: 'Table 5' })
    expect(webpush.sendNotification).toHaveBeenCalledTimes(2)
    expect(webpush.sendNotification).toHaveBeenCalledWith(
      { endpoint: 'https://e1.example.com', keys: { p256dh: 'p1', auth: 'a1' } },
      JSON.stringify({ title: 'New Order', body: 'Table 5' }),
    )
  })

  it('sendToRole sends nothing when no subscriptions exist', async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([])
    await service.sendToRole('kitchen', { title: 'Test', body: 'Test' })
    expect(webpush.sendNotification).not.toHaveBeenCalled()
  })

  it('sendToStaff sends to subscriptions for a specific staff member', async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([
      { endpoint: 'https://waiter.example.com', p256dh: 'pw', auth: 'aw' },
    ])
    await service.sendToStaff('staff-42', { title: 'Order Ready', body: 'Table 3' })
    expect(mockPrisma.pushSubscription.findMany).toHaveBeenCalledWith({
      where: { staffId: 'staff-42' },
    })
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1)
  })

  it('sendToRole does not throw when a push call fails', async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([
      { endpoint: 'https://gone.example.com', p256dh: 'p', auth: 'a' },
    ])
    ;(webpush.sendNotification as jest.Mock).mockRejectedValueOnce(new Error('410 Gone'))
    await expect(service.sendToRole('manager', { title: 'Low Stock', body: 'Tomatoes' })).resolves.not.toThrow()
  })
})
