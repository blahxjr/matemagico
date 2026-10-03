-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('credentials');

-- CreateEnum
CREATE TYPE "PasswordHashAlgorithm" AS ENUM ('ARGON2ID');

-- CreateEnum
CREATE TYPE "MembershipState" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "RoleScope" AS ENUM ('SCHOOL', 'GLOBAL');

-- CreateEnum
CREATE TYPE "RoleCatalogStatus" AS ENUM ('APPROVED', 'REMOVED');

-- CreateTable
CREATE TABLE "AuthAccount" (
    "authAccountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "subject" TEXT NOT NULL,

    CONSTRAINT "AuthAccount_pkey" PRIMARY KEY ("authAccountId")
);

-- CreateTable
CREATE TABLE "PasswordCredential" (
    "passwordCredentialId" TEXT NOT NULL,
    "authAccountId" TEXT NOT NULL,
    "encodedHash" TEXT NOT NULL,
    "hashAlgorithm" "PasswordHashAlgorithm" NOT NULL,
    "memoryCost" INTEGER NOT NULL,
    "timeCost" INTEGER NOT NULL,
    "parallelism" INTEGER NOT NULL,
    "passwordChangedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordCredential_pkey" PRIMARY KEY ("passwordCredentialId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "absoluteExpiresAt" TIMESTAMP(3) NOT NULL,
    "idleExpiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revocationReason" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("sessionId")
);

-- CreateTable
CREATE TABLE "SchoolMembership" (
    "membershipId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "state" "MembershipState" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "SchoolMembership_pkey" PRIMARY KEY ("membershipId")
);

-- CreateTable
CREATE TABLE "Role" (
    "roleId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "scope" "RoleScope" NOT NULL,
    "status" "RoleCatalogStatus" NOT NULL,
    "privileged" BOOLEAN NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("roleId")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionCode" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionCode")
);

-- CreateTable
CREATE TABLE "RoleGrantAllowlist" (
    "actorUserId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "RoleGrantAllowlist_pkey" PRIMARY KEY ("actorUserId","schoolId","roleId")
);

-- CreateTable
CREATE TABLE "Grant" (
    "grantId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "grantedBy" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Grant_pkey" PRIMARY KEY ("grantId")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthAccount_userId_key" ON "AuthAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthAccount_provider_subject_key" ON "AuthAccount"("provider", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordCredential_authAccountId_key" ON "PasswordCredential"("authAccountId");

-- CreateIndex
CREATE INDEX "Session_userId_revokedAt_absoluteExpiresAt_idleExpiresAt_idx" ON "Session"("userId", "revokedAt", "absoluteExpiresAt", "idleExpiresAt");

-- CreateIndex
CREATE INDEX "SchoolMembership_userId_schoolId_state_idx" ON "SchoolMembership"("userId", "schoolId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE INDEX "Grant_membershipId_roleId_idx" ON "Grant"("membershipId", "roleId");

-- AddForeignKey
ALTER TABLE "PasswordCredential" ADD CONSTRAINT "PasswordCredential_authAccountId_fkey" FOREIGN KEY ("authAccountId") REFERENCES "AuthAccount"("authAccountId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("roleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleGrantAllowlist" ADD CONSTRAINT "RoleGrantAllowlist_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("roleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grant" ADD CONSTRAINT "Grant_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "SchoolMembership"("membershipId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grant" ADD CONSTRAINT "Grant_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("roleId") ON DELETE RESTRICT ON UPDATE CASCADE;


-- At most one open (PENDING or ACTIVE) Membership per User-School pair (MRI-004).
CREATE UNIQUE INDEX "SchoolMembership_open_user_school_key"
  ON "SchoolMembership" ("userId", "schoolId")
  WHERE "state" IN ('PENDING', 'ACTIVE');
