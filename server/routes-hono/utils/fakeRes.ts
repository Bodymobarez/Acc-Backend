/**
 * Utility to create a proper fake Express response adapter for Hono
 * This captures the controller's response data and status code correctly
 */
export function createFakeRes(c: any) {
  let result: any;
  const fakeRes: any = {
    json: (data: any) => {
      result = data;
      return fakeRes;
    },
    status: (code: number) => {
      fakeRes.statusCode = code;
      return fakeRes;
    }
  };

  return {
    fakeRes,
    getResult: () => result,
    getStatusCode: () => fakeRes.statusCode || 200
  };
}
