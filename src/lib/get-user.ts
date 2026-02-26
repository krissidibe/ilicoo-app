import { authClient } from "./auth-client";

export const getSession = async () => {
  const session = await authClient.getSession();
  if (!session) {
    return null;
  }
  return session;
};
export const getUser = async () => {
  const session = await getSession();
  return session?.data?.user;
};
