import { prisma } from './index.js';

async function main() {
  console.log('🌱 Starting U-ABAC database seeding...');

  // 1. Clear existing data in reverse order of dependencies
  await prisma.accessAuditLog.deleteMany();
  await prisma.userAttribute.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.policyRule.deleteMany();
  await prisma.policy.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing records.');

  // 2. Seed Users
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@university.edu',
      name: 'System Admin',
      passwordHash: 'argon2_mock_hash_admin',
      role: 'ADMIN',
      department: 'IT Administration',
      clearanceLevel: 'TOP_SECRET',
      isActive: true,
      userAttributes: {
        create: [
          { key: 'is_sysadmin', value: 'true' },
          { key: 'security_group', value: 'superusers' },
        ],
      },
    },
  });

  const profCs = await prisma.user.create({
    data: {
      email: 'prof.smith@university.edu',
      name: 'Dr. Alan Smith',
      passwordHash: 'argon2_mock_hash_faculty',
      role: 'STAFF',
      department: 'Computer Science',
      clearanceLevel: 'CONFIDENTIAL',
      isActive: true,
      userAttributes: {
        create: [
          { key: 'faculty_tenure', value: 'true' },
          { key: 'research_lead', value: 'cs_ai_lab' },
        ],
      },
    },
  });

  const studentCs = await prisma.user.create({
    data: {
      email: 'alex.chen@university.edu',
      name: 'Alex Chen',
      passwordHash: 'argon2_mock_hash_student',
      role: 'STUDENT',
      department: 'Computer Science',
      clearanceLevel: 'INTERNAL',
      isActive: true,
      userAttributes: {
        create: [
          { key: 'cohort_year', value: '2023' },
          { key: 'standing', value: 'SENIOR' },
        ],
      },
    },
  });

  const studentEe = await prisma.user.create({
    data: {
      email: 'sara.miller@university.edu',
      name: 'Sara Miller',
      passwordHash: 'argon2_mock_hash_student_ee',
      role: 'STUDENT',
      department: 'Electrical Engineering',
      clearanceLevel: 'INTERNAL',
      isActive: true,
      userAttributes: {
        create: [
          { key: 'cohort_year', value: '2024' },
          { key: 'standing', value: 'JUNIOR' },
        ],
      },
    },
  });

  const guestUser = await prisma.user.create({
    data: {
      email: 'guest@external.org',
      name: 'External Visitor',
      passwordHash: 'argon2_mock_hash_guest',
      role: 'GUEST',
      department: 'External',
      clearanceLevel: 'PUBLIC',
      isActive: true,
    },
  });

  console.log('👤 Created sample users (Admin, Faculty, CS Student, EE Student, Guest).');

  // 3. Seed Resources
  await prisma.resource.createMany({
    data: [
      {
        title: 'CS-101 Course Syllabus & Lecture Slides',
        type: 'syllabus',
        department: 'Computer Science',
        classification: 'PUBLIC',
        ownerId: profCs.id,
        metadata: JSON.stringify({ semester: 'Fall 2026', courseId: 'CS-101' }),
      },
      {
        title: 'CS-401 Distributed Systems Midterm Exam Draft',
        type: 'exam_paper',
        department: 'Computer Science',
        classification: 'CONFIDENTIAL',
        ownerId: profCs.id,
        metadata: JSON.stringify({ semester: 'Fall 2026', courseId: 'CS-401' }),
      },
      {
        title: 'Autonomous Drone Navigation Patent Draft',
        type: 'patent',
        department: 'Electrical Engineering',
        classification: 'TOP_SECRET',
        ownerId: adminUser.id,
        metadata: JSON.stringify({ patentId: 'US-AI-2026-99', grantStatus: 'pending' }),
      },
      {
        title: 'University Campus Safety & Health Protocol',
        type: 'policy_doc',
        department: 'IT Administration',
        classification: 'INTERNAL',
        ownerId: adminUser.id,
        metadata: JSON.stringify({ revision: '3.1' }),
      },
    ],
  });

  console.log('📁 Created sample protected resources.');

  // 4. Seed ABAC Policies
  // Policy 1: Admin Override Policy
  await prisma.policy.create({
    data: {
      name: 'Administrator Full Access Override',
      description: 'Superusers and IT Administrators bypass restrictions for all operations.',
      resourceType: '*',
      priority: 100,
      isEnabled: true,
      rules: {
        create: [
          {
            name: 'Admin Global Permit',
            effect: 'PERMIT',
            actions: 'CREATE,READ,UPDATE,DELETE,EXPORT,APPROVE',
            conditions: JSON.stringify([
              { field: 'subject.role', operator: 'EQUALS', value: 'ADMIN' },
            ]),
          },
        ],
      },
    },
  });

  // Policy 2: Public Resource Access
  await prisma.policy.create({
    data: {
      name: 'Public Resources Open Read Access',
      description: 'Any authenticated user can read public classification resources.',
      resourceType: '*',
      priority: 10,
      isEnabled: true,
      rules: {
        create: [
          {
            name: 'Public Read Rule',
            effect: 'PERMIT',
            actions: 'READ',
            conditions: JSON.stringify([
              { field: 'resource.classification', operator: 'EQUALS', value: 'PUBLIC' },
            ]),
          },
        ],
      },
    },
  });

  // Policy 3: Department Staff Exam Management
  await prisma.policy.create({
    data: {
      name: 'Departmental Exam & Academic Management',
      description: 'Faculty can manage exam papers only within their own academic department.',
      resourceType: 'exam_paper',
      priority: 50,
      isEnabled: true,
      rules: {
        create: [
          {
            name: 'Staff Same Department Full Access',
            effect: 'PERMIT',
            actions: 'CREATE,READ,UPDATE,DELETE,APPROVE',
            conditions: JSON.stringify([
              { field: 'subject.role', operator: 'EQUALS', value: 'STAFF' },
              { field: 'subject.department', operator: 'EQUALS', value: 'resource.department' },
            ]),
          },
          {
            name: 'Block Students from Confidential Exams',
            effect: 'DENY',
            actions: 'READ,UPDATE,DELETE,CREATE',
            conditions: JSON.stringify([
              { field: 'subject.role', operator: 'EQUALS', value: 'STUDENT' },
              { field: 'resource.classification', operator: 'EQUALS', value: 'CONFIDENTIAL' },
            ]),
          },
        ],
      },
    },
  });

  // Policy 4: Top Secret Classification
  await prisma.policy.create({
    data: {
      name: 'Top Secret Patent & Research Protection',
      description: 'Requires subject clearance to be TOP_SECRET.',
      resourceType: 'patent',
      priority: 80,
      isEnabled: true,
      rules: {
        create: [
          {
            name: 'Must Have TOP_SECRET Clearance',
            effect: 'PERMIT',
            actions: 'READ,EXPORT',
            conditions: JSON.stringify([
              { field: 'subject.clearanceLevel', operator: 'EQUALS', value: 'TOP_SECRET' },
            ]),
          },
        ],
      },
    },
  });

  console.log('🛡 Seeded core ABAC policies and rules.');
  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

