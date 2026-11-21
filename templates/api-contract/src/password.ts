/**
 * How long a password has to be at least. The api refuses a shorter one, and its apps say so before sending it. Long
 * enough for a password that is the only factor, see the auth docs of zibri.
 */
export const PASSWORD_MIN_LENGTH: number = 15;
