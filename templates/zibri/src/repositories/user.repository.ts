import { BaseUserRepository, ChangeSetRepository, RepositoryFor } from 'zibri';

import { User } from '../models';

// a ChangeSetRepository, as the changes of a user are recorded
@RepositoryFor(User)
export class UserRepository extends BaseUserRepository<User>(ChangeSetRepository) {}
