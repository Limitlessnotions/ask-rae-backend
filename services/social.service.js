import { publish } from "./publishing/publisher.service.js";


export async function publishContent(data) {

    return await publish(data);

}