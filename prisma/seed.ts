import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const defaultContests = [
    {
      name: 'Summer Challenge',
      slug: 'acm-summer-challenge-2026',
      icon: 'Sun',
      description: 'The annual summer programming challenge for all members.',
    },
    {
      name: 'Mirror Challenge',
      slug: 'acm-mirror-challenge-2026',
      icon: 'Copy',
      description: 'Mirror of the official regional contest.',
    },
  ];

  for (const contest of defaultContests) {
    await prisma.contest.upsert({
      where: { slug: contest.slug },
      update: {},
      create: {
        name: contest.name,
        slug: contest.slug,
        icon: contest.icon,
        description: contest.description,
        enabled: true,
      },
    });
    console.log(`Upserted contest: ${contest.name}`);
  }

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
