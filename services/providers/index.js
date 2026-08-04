import FacebookProvider from "./facebook/index.js";
import InstagramProvider from "./instagram/index.js";
import TikTokProvider from "./tiktok/index.js";
import XProvider from "./x/index.js";

const providers = {
  facebook: FacebookProvider,
  instagram: InstagramProvider,
  tiktok: TikTokProvider,
   x: XProvider,
};

export default providers;