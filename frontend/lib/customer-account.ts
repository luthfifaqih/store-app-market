function providerUrl(value?: string) {
  try {
    const url = new URL(value || "");
    return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
}
const login = providerUrl(process.env.NEXT_PUBLIC_CUSTOMER_LOGIN_URL);
const signup = providerUrl(process.env.NEXT_PUBLIC_CUSTOMER_REGISTER_URL);
export const customerAccount =
  process.env.NEXT_PUBLIC_ENABLE_CUSTOMER_ACCOUNT === "true" && login && signup ? { login, signup } : null;
