/*
|--------------------------------------------------------------------------
| Facebook Provider
|--------------------------------------------------------------------------
|
| Every provider exposes the exact same interface.
| This allows the Publisher Engine to work with any platform
| without knowing how that platform works internally.
|
*/

const FacebookProvider = {

  connect: async () => {
    throw new Error("Facebook connect not implemented.");
  },

  refreshToken: async () => {
    throw new Error("Facebook refresh not implemented.");
  },

  publish: async () => {
    throw new Error("Facebook publish not implemented.");
  },

  getProfile: async () => {
    throw new Error("Facebook profile not implemented.");
  },

  disconnect: async () => {
    throw new Error("Facebook disconnect not implemented.");
  }

};

export default LinkedInProvider;