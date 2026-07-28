import axios from "axios";
import { FACEBOOK_CONFIG } from "../config/facebook.config.js";
import crypto from "crypto";

const GRAPH_URL = "https://graph.facebook.com/v23.0";

export function getFacebookLoginUrl(state) {
  const params = new URLSearchParams({
    client_id: FACEBOOK_CONFIG.appId,
    redirect_uri: FACEBOOK_CONFIG.redirectUri,
    scope: FACEBOOK_CONFIG.scopes,
    response_type: "code",
    state,
  });

  return `https://www.facebook.com/v23.0/dialog/oauth?${params.toString()}`;
}

export async function exchangeCodeForToken(code) {
  const response = await axios.get(`${GRAPH_URL}/oauth/access_token`, {
    params: {
      client_id: FACEBOOK_CONFIG.appId,
      client_secret: FACEBOOK_CONFIG.appSecret,
      redirect_uri: FACEBOOK_CONFIG.redirectUri,
      code,
    },
  });

  return response.data;
}

export async function getUserPages(accessToken) {
  const response = await axios.get(`${GRAPH_URL}/me/accounts`, {
    params: {
      access_token: accessToken,
    },
  });

  return response.data.data;
}
export function generateStateToken() {
  return crypto.randomUUID();
}