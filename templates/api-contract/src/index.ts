// what "{{=apiName}}" and its apps agree on: the names of its permissions, routes and apps, and the models it answers
// with. It runs in the browser and on node, so it imports neither zibri nor Angular, only zibri-contract
export * from './invitation.model';
export * from './log-application.enum';
export * from './password';
export * from './paths';
export * from './permissions';
export * from './role.model';
export * from './tenant.model';
export * from './user.model';
