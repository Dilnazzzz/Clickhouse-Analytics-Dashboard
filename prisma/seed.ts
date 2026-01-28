import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Seed example event definitions
  const eventNames = [
    'signup_started',
    'signup_completed',
    'first_project_created',
    'app_opened',
    'button_clicked'
  ]

  for (const name of eventNames) {
    await prisma.eventDefinition.upsert({
      where: { name },
      update: {},
      create: { name }
    })
  }

  // Seed a couple of funnels
  await prisma.funnel.createMany({
    data: [
      {
        name: 'Signup Funnel',
        stepsJson: [
          'signup_started',
          'signup_completed',
          'first_project_created'
        ] as unknown as any
      },
      {
        name: 'Activation Funnel',
        stepsJson: [
          'app_opened',
          'button_clicked'
        ] as unknown as any
      }
    ],
    skipDuplicates: true
  })

  console.log('Seed complete')
}

main().finally(async () => {
  await prisma.$disconnect()
})

