import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import {
  Argon2idPasswordHasher,
  Argon2idPasswordVerifier,
  AuthAccountPrismaRepository,
  AuthenticateUserService,
  CredentialPrismaStore,
  GetSessionService,
  PrismaLoginAttemptLimiter,
  LogoutUserService,
  PasswordCredentialPrismaRepository,
  ProvisionPasswordCredentialService,
  RevokeSessionService,
  SessionPrismaRepository,
  systemClock,
  userId as toAuthUserId,
  uuidSessionIdGenerator,
  type Clock as AuthClock,
  type LoginAttemptLimiter,
  type PasswordVerifier,
  type SessionIdGenerator,
  type UserRepository as AuthUserRepository,
} from '@matemagico/auth';
import {
  ActivateMembershipService,
  CreateMembershipService,
  GrantBasedActorAuthorizer,
  InMemoryPermissionCache,
  GrantPrismaRepository,
  GrantRoleService,
  PermissionPrismaRepository,
  ResolvePermissionsService,
  ResolveSchoolContextService,
  RolePrismaRepository,
  SchoolMembershipPrismaRepository,
  ValidateSchoolContextService,
  type ActorAuthorizer,
  type Clock as MembershipClock,
  type GrantIdGenerator,
  type MembershipEventPublisher,
  type MembershipIdGenerator,
  type SchoolDirectory,
  type UserDirectory,
} from '@matemagico/membership';
import { PrismaAuditRepository, RecordAuditEvent } from '@matemagico/audit';
import {
  CreateSchoolService,
  DeactivateSchoolService,
  FindSchoolBySlugService,
  GetSchoolService,
  PrismaSchoolRepository,
  SchoolDirectory as SchoolsDirectory,
  type SchoolEventPublisher,
} from '@matemagico/schools';
import {
  ArchiveQuestionService,
  ApproveQuestionService,
  CreateQuestionService,
  EditorialDashboardService,
  GetQuestionService,
  ImportQuestionsService,
  ImportQuestionsFromXlsx,
  ListQuestionsService,
  PrismaQuestionRepository,
  PrismaImportExecutionRepository,
  PublishQuestionService,
  RejectQuestionService,
  ReturnToReviewService,
  StartReviewService,
  UpdateQuestionService,
  ValidateQuestion,
  VersionQuestionService,
} from '@matemagico/questions';
import {
  GenerateQuestionSet,
  PrismaQuestionCatalog,
  ValidateQuestionSet,
} from '@matemagico/question-engine';
import {
  ArchiveMockExam,
  CreateMockExam,
  GetMockExam,
  ListMockExams,
  PrismaMockExamRepository,
  PublishMockExam,
  UpdateMockExam,
  StartExam,
} from '@matemagico/mock-exams';
import {
  ExpireAttempt,
  FinishAttempt,
  GetAttempt,
  GetAttemptHistory,
  GetSchoolPerformance,
  PrismaAttemptRepository,
  StartAttempt,
  SubmitAnswer,
} from '@matemagico/attempts';
import {
  GetExamRanking,
  GetSchoolRanking,
  PrismaRankingRepository,
  RankingProjectionHandler,
  UpdateRankingFromAttemptCompleted,
} from '@matemagico/rankings';
import { AttemptCompletedDispatcher, ListSchoolMembersService } from './admin-services';
import {
  CreateTopicService,
  DeactivateTopicService,
  GetTopicService,
  ListTopicsService,
  PrismaTopicRepository,
  TopicDirectory,
  UpdateTopicService,
} from '@matemagico/topics';
import {
  CreateUserService,
  DeactivateUserService,
  FindUserByEmailService,
  GetUserService,
  PrismaUserRepository,
  UserDirectory as UsersDirectory,
  type UserEventPublisher,
} from '@matemagico/users';
import {
  discardingEventPublisher,
  discardingSchoolEventPublisher,
  discardingUserEventPublisher,
} from './event-publishers';
import {
  FoundSchoolService,
  GetProfileService,
  GetSessionActorService,
  RegisterUserService,
} from './platform-services';

/** Optional replacements for the real adapters, used by tests. */
export interface CompositionOverrides {
  readonly actorAuthorizer?: ActorAuthorizer;
  readonly userDirectory?: UserDirectory;
  readonly schoolDirectory?: SchoolDirectory;
  readonly userRepository?: AuthUserRepository;
  readonly passwordVerifier?: PasswordVerifier;
  readonly events?: MembershipEventPublisher;
  readonly userEvents?: UserEventPublisher;
  readonly schoolEvents?: SchoolEventPublisher;
  readonly attemptLimiter?: LoginAttemptLimiter;
  readonly clock?: AuthClock & MembershipClock;
  readonly sessionIds?: SessionIdGenerator;
  readonly membershipIds?: MembershipIdGenerator;
  readonly grantIds?: GrantIdGenerator;
}

export interface CompositionRoot {
  readonly prisma: PrismaClient;
  readonly repositories: {
    readonly authAccounts: AuthAccountPrismaRepository;
    readonly passwordCredentials: PasswordCredentialPrismaRepository;
    readonly sessions: SessionPrismaRepository;
    readonly memberships: SchoolMembershipPrismaRepository;
    readonly roles: RolePrismaRepository;
    readonly grants: GrantPrismaRepository;
    readonly permissions: PermissionPrismaRepository;
    readonly users: PrismaUserRepository;
    readonly schools: PrismaSchoolRepository;
    readonly topics: PrismaTopicRepository;
    readonly questions: PrismaQuestionRepository;
    readonly mockExams: PrismaMockExamRepository;
    readonly attempts: PrismaAttemptRepository;
    readonly rankings: PrismaRankingRepository;
    readonly audit: PrismaAuditRepository;
  };
  readonly directories: {
    readonly users: UsersDirectory;
    readonly schools: SchoolsDirectory;
    readonly topics: TopicDirectory;
  };
  readonly actorAuthorizer: InMemoryPermissionCache;
  readonly permissionCache: InMemoryPermissionCache;
  /** Shared with the login flow; also throttles public registration per IP. */
  readonly attemptLimiter: LoginAttemptLimiter;
  readonly services: {
    readonly revokeSession: RevokeSessionService;
    readonly logoutUser: LogoutUserService;
    readonly getSessionActor: GetSessionActorService;
    readonly registerUser: RegisterUserService;
    readonly getProfile: GetProfileService;
    readonly foundSchool: FoundSchoolService;
    readonly authenticateUser: AuthenticateUserService;
    readonly getSession: GetSessionService;
    readonly createMembership: CreateMembershipService;
    readonly activateMembership: ActivateMembershipService;
    readonly grantRole: GrantRoleService;
    readonly resolveSchoolContext: ResolveSchoolContextService;
    readonly resolvePermissions: ResolvePermissionsService;
    readonly validateSchoolContext: ValidateSchoolContextService;
    readonly createUser: CreateUserService;
    readonly getUser: GetUserService;
    readonly findUserByEmail: FindUserByEmailService;
    readonly deactivateUser: DeactivateUserService;
    readonly provisionPasswordCredential: ProvisionPasswordCredentialService;
    readonly createSchool: CreateSchoolService;
    readonly getSchool: GetSchoolService;
    readonly findSchoolBySlug: FindSchoolBySlugService;
    readonly deactivateSchool: DeactivateSchoolService;
    readonly createTopic: CreateTopicService;
    readonly updateTopic: UpdateTopicService;
    readonly deactivateTopic: DeactivateTopicService;
    readonly getTopic: GetTopicService;
    readonly listTopics: ListTopicsService;
    readonly createQuestion: CreateQuestionService;
    readonly versionQuestion: VersionQuestionService;
    readonly publishQuestion: PublishQuestionService;
    readonly archiveQuestion: ArchiveQuestionService;
    readonly getQuestion: GetQuestionService;
    readonly listQuestions: ListQuestionsService;
    readonly importQuestions: ImportQuestionsService;
    readonly importQuestionsFromXlsx: ImportQuestionsFromXlsx;
    readonly startReview: StartReviewService;
    readonly updateQuestion: UpdateQuestionService;
    readonly approveQuestion: ApproveQuestionService;
    readonly validateQuestion: ValidateQuestion;
    readonly rejectQuestion: RejectQuestionService;
    readonly returnToReview: ReturnToReviewService;
    readonly editorialDashboard: EditorialDashboardService;
    readonly generateQuestionSet: GenerateQuestionSet;
    readonly validateQuestionSet: ValidateQuestionSet;
    readonly createMockExam: CreateMockExam;
    readonly publishMockExam: PublishMockExam;
    readonly updateMockExam: UpdateMockExam;
    readonly archiveMockExam: ArchiveMockExam;
    readonly getMockExam: GetMockExam;
    readonly listMockExams: ListMockExams;
    readonly startExam: StartExam;
    readonly startAttempt: StartAttempt;
    readonly submitAnswer: SubmitAnswer;
    readonly finishAttempt: FinishAttempt;
    readonly expireAttempt: ExpireAttempt;
    readonly getAttempt: GetAttempt;
    readonly getAttemptHistory: GetAttemptHistory;
    readonly getSchoolPerformance: GetSchoolPerformance;
    readonly getSchoolRanking: GetSchoolRanking;
    readonly getExamRanking: GetExamRanking;
    readonly rankingProjectionHandler: RankingProjectionHandler;
    readonly attemptCompletedDispatcher: AttemptCompletedDispatcher;
    readonly listSchoolMembers: ListSchoolMembersService;
    readonly recordAuditEvent: RecordAuditEvent;
  };
}

/** Wires every application service to Prisma adapters sharing the given PrismaClient. */
export function createCompositionRoot(
  prisma: PrismaClient,
  overrides: CompositionOverrides = {},
): CompositionRoot {
  const clock = overrides.clock ?? systemClock;
  const events = overrides.events ?? discardingEventPublisher;

  const repositories = {
    authAccounts: new AuthAccountPrismaRepository(prisma),
    passwordCredentials: new PasswordCredentialPrismaRepository(prisma),
    sessions: new SessionPrismaRepository(prisma),
    memberships: new SchoolMembershipPrismaRepository(prisma),
    roles: new RolePrismaRepository(prisma),
    grants: new GrantPrismaRepository(prisma),
    permissions: new PermissionPrismaRepository(prisma),
    users: new PrismaUserRepository(prisma),
    schools: new PrismaSchoolRepository(prisma),
    topics: new PrismaTopicRepository(prisma),
    questions: new PrismaQuestionRepository(prisma),
    importExecutions: new PrismaImportExecutionRepository(prisma),
    mockExams: new PrismaMockExamRepository(prisma),
    attempts: new PrismaAttemptRepository(prisma),
    rankings: new PrismaRankingRepository(prisma),
    audit: new PrismaAuditRepository(prisma),
  };

  const directories = {
    users: new UsersDirectory(repositories.users),
    schools: new SchoolsDirectory(repositories.schools),
    topics: new TopicDirectory(repositories.topics),
  };

  const authUsers: AuthUserRepository = {
    findByNormalizedEmail: async (email) => {
      const user = await repositories.users.findByEmail(email);
      return user ? { userId: toAuthUserId(user.id), status: user.status } : null;
    },
    findByUserId: async (id) => {
      const user = await repositories.users.findById(id);
      return user ? { userId: toAuthUserId(user.id), status: user.status } : null;
    },
  };

  const users = overrides.userRepository ?? authUsers;
  const userDirectory = overrides.userDirectory ?? directories.users;
  const schools = overrides.schoolDirectory ?? directories.schools;
  const baseActorAuthorizer = new GrantBasedActorAuthorizer({
    memberships: repositories.memberships,
    grants: repositories.grants,
    roles: repositories.roles,
    permissions: repositories.permissions,
    clock,
  });
  const actorAuthorizer = new InMemoryPermissionCache(baseActorAuthorizer);
  const membershipAuthorizer = overrides.actorAuthorizer ?? actorAuthorizer;
  const resolveSchoolContext = new ResolveSchoolContextService({
    memberships: repositories.memberships,
    users: userDirectory,
    schools,
    clock,
  });

  const attemptLimiter = overrides.attemptLimiter ?? new PrismaLoginAttemptLimiter(prisma);
  const getSession = new GetSessionService({ sessions: repositories.sessions, users, clock });
  const revokeSession = new RevokeSessionService({
    sessions: repositories.sessions,
    getSession,
    clock,
  });
  const createUser = new CreateUserService({
    users: repositories.users,
    events: overrides.userEvents ?? discardingUserEventPublisher,
    clock,
    ids: { next: () => randomUUID() },
  });
  const getUser = new GetUserService({ users: repositories.users });
  const deactivateUser = new DeactivateUserService({ users: repositories.users, clock });
  const provisionPasswordCredential = new ProvisionPasswordCredentialService({
    credentials: new CredentialPrismaStore(prisma),
    hasher: new Argon2idPasswordHasher(),
    clock,
  });
  const createSchool = new CreateSchoolService({
    schools: repositories.schools,
    events: overrides.schoolEvents ?? discardingSchoolEventPublisher,
    clock,
    ids: { next: () => randomUUID() },
  });
  const deactivateSchool = new DeactivateSchoolService({
    schools: repositories.schools,
    authorizer: actorAuthorizer,
    clock,
  });

  const createQuestion = new CreateQuestionService({
    questions: repositories.questions,
    topics: directories.topics,
    clock,
    ids: { next: () => randomUUID() },
  });
  const publishQuestion = new PublishQuestionService({
    questions: repositories.questions,
    topics: directories.topics,
    clock,
  });

  const rankingProjectionHandler = new RankingProjectionHandler(
    new UpdateRankingFromAttemptCompleted(repositories.rankings, clock),
  );

  const services = {
    generateQuestionSet: new GenerateQuestionSet(new PrismaQuestionCatalog(prisma)),
    validateQuestionSet: new ValidateQuestionSet(),
    createMockExam: new CreateMockExam({
      exams: repositories.mockExams,
      questionSets: new GenerateQuestionSet(new PrismaQuestionCatalog(prisma)),
      clock,
      ids: { next: () => randomUUID() },
    }),
    authenticateUser: new AuthenticateUserService({
      users,
      authAccounts: repositories.authAccounts,
      passwordCredentials: repositories.passwordCredentials,
      sessions: repositories.sessions,
      passwordVerifier: overrides.passwordVerifier ?? new Argon2idPasswordVerifier(),
      attemptLimiter,
      clock,
      sessionIds: overrides.sessionIds ?? uuidSessionIdGenerator,
    }),
    getSession,
    revokeSession,
    logoutUser: new LogoutUserService(revokeSession),
    registerUser: new RegisterUserService({
      createUser,
      deactivateUser,
      provision: provisionPasswordCredential,
    }),
    createMembership: new CreateMembershipService({
      memberships: repositories.memberships,
      actorAuthorizer: membershipAuthorizer,
      users: userDirectory,
      schools,
      clock,
      membershipIds: overrides.membershipIds ?? { next: () => randomUUID() },
    }),
    activateMembership: new ActivateMembershipService({
      memberships: repositories.memberships,
      actorAuthorizer: membershipAuthorizer,
      users: userDirectory,
      schools,
      events,
      clock,
    }),
    grantRole: new GrantRoleService({
      memberships: repositories.memberships,
      roles: repositories.roles,
      grants: repositories.grants,
      actorAuthorizer: membershipAuthorizer,
      schools,
      events,
      clock,
      grantIds: overrides.grantIds ?? { next: () => randomUUID() },
    }),
    resolveSchoolContext,
    resolvePermissions: new ResolvePermissionsService({
      schoolContext: resolveSchoolContext,
      grants: repositories.grants,
      roles: repositories.roles,
      permissions: repositories.permissions,
      clock,
    }),
    validateSchoolContext: new ValidateSchoolContextService({
      memberships: repositories.memberships,
      users: userDirectory,
      schools,
    }),
    createUser,
    getUser,
    findUserByEmail: new FindUserByEmailService({ users: repositories.users }),
    deactivateUser,
    provisionPasswordCredential,
    createSchool,
    getSchool: new GetSchoolService({ schools: repositories.schools }),
    findSchoolBySlug: new FindSchoolBySlugService({ schools: repositories.schools }),
    deactivateSchool,
    createTopic: new CreateTopicService({
      topics: repositories.topics,
      clock,
      ids: { next: () => randomUUID() },
    }),
    updateTopic: new UpdateTopicService({ topics: repositories.topics, clock }),
    deactivateTopic: new DeactivateTopicService({ topics: repositories.topics, clock }),
    getTopic: new GetTopicService({ topics: repositories.topics }),
    listTopics: new ListTopicsService({ topics: repositories.topics }),
    createQuestion,
    versionQuestion: new VersionQuestionService({
      questions: repositories.questions,
      topics: directories.topics,
      clock,
    }),
    publishQuestion,
    archiveQuestion: new ArchiveQuestionService({ questions: repositories.questions, clock }),
    getQuestion: new GetQuestionService({ questions: repositories.questions }),
    listQuestions: new ListQuestionsService({ questions: repositories.questions }),
    importQuestions: new ImportQuestionsService({
      questions: repositories.questions,
      topics: directories.topics,
      create: createQuestion,
    }),
    importQuestionsFromXlsx: new ImportQuestionsFromXlsx({
      questions: repositories.questions,
      topics: repositories.topics,
      executions: repositories.importExecutions,
      clock,
      ids: { next: () => randomUUID() },
    }),
    startReview: new StartReviewService({ questions: repositories.questions, clock }),
    updateQuestion: new UpdateQuestionService({
      questions: repositories.questions,
      topics: directories.topics,
      clock,
    }),
    approveQuestion: new ApproveQuestionService({
      questions: repositories.questions,
      topics: directories.topics,
      clock,
    }),
    validateQuestion: new ValidateQuestion({
      questions: repositories.questions,
      topics: directories.topics,
    }),
    rejectQuestion: new RejectQuestionService({ questions: repositories.questions, clock }),
    returnToReview: new ReturnToReviewService({ questions: repositories.questions, clock }),
    editorialDashboard: new EditorialDashboardService(
      repositories.questions,
      repositories.importExecutions,
    ),
    publishMockExam: new PublishMockExam({ exams: repositories.mockExams, clock }),
    updateMockExam: new UpdateMockExam({ exams: repositories.mockExams, clock }),
    archiveMockExam: new ArchiveMockExam({ exams: repositories.mockExams, clock }),
    getMockExam: new GetMockExam(repositories.mockExams),
    listMockExams: new ListMockExams(repositories.mockExams),
    startExam: new StartExam({ exams: repositories.mockExams, clock }),
    startAttempt: new StartAttempt({
      attempts: repositories.attempts,
      exams: repositories.mockExams,
      clock,
      ids: { next: () => randomUUID() },
    }),
    submitAnswer: new SubmitAnswer({ attempts: repositories.attempts, clock }),
    finishAttempt: new FinishAttempt({ attempts: repositories.attempts, clock }),
    expireAttempt: new ExpireAttempt({ attempts: repositories.attempts, clock }),
    getAttempt: new GetAttempt({ attempts: repositories.attempts }),
    getAttemptHistory: new GetAttemptHistory({ attempts: repositories.attempts }),
    getSchoolPerformance: new GetSchoolPerformance({ attempts: repositories.attempts }),
    getSchoolRanking: new GetSchoolRanking(repositories.rankings),
    getExamRanking: new GetExamRanking(repositories.rankings),
    rankingProjectionHandler,
    attemptCompletedDispatcher: new AttemptCompletedDispatcher({
      prisma,
      handler: rankingProjectionHandler,
    }),
    listSchoolMembers: new ListSchoolMembersService({ prisma, clock }),
    recordAuditEvent: new RecordAuditEvent({
      repository: repositories.audit,
      now: () => clock.now(),
      nextId: () => randomUUID(),
    }),
  };

  const foundSchool = new FoundSchoolService({
    prisma,
    createSchool,
    deactivate: async (schoolId) => {
      const school = await repositories.schools.findById(schoolId);
      if (school) await repositories.schools.save(school.deactivate(clock.now()));
    },
    clock,
  });

  return {
    prisma,
    repositories,
    directories,
    actorAuthorizer,
    permissionCache: actorAuthorizer,
    attemptLimiter,
    services: {
      ...services,
      getSessionActor: new GetSessionActorService({
        getSession,
        users: getUser,
        schoolContext: resolveSchoolContext,
        permissions: services.resolvePermissions,
      }),
      getProfile: new GetProfileService({ prisma, users: getUser, clock }),
      foundSchool,
    },
  };
}
