const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const contests = await prisma.contest.findMany();
  console.log(`Found ${contests.length} contests`);
  
  for (const c of contests) {
    const p = await prisma.problem.count({where:{contestId:c.id}});
    const s = await prisma.submission.count({where:{problem:{contestId:c.id}}});
    
    // Check how many participants have submissions in this contest
    const participants = await prisma.user.count({
      where: {
        submissions: {
          some: {
            problem: { contestId: c.id }
          }
        }
      }
    });
    
    console.log('---');
    console.log(`Contest: ${c.slug}`);
    console.log(`Problems: ${p}`);
    console.log(`Submissions: ${s}`);
    console.log(`Participants: ${participants}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
