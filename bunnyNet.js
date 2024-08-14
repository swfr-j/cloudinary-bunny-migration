import axios from "axios";
import { createReadStream } from "fs";

const httpMode = process.env.BUNNYCDN_HTTP_MODE || "https";

class BCDN {
  headers;
  publicDomain;
  baseUrl;
  axios;

  constructor(
    apiKey,
    baseURLDomain,
    storageZone,
    publicDomain,
  ) {
    this.headers = {
      AccessKey: apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    this.publicDomain = publicDomain;
    this.baseUrl = `${httpMode}://${storageZoneRegion}.${baseURLDomain}/${storageZone}`;

    this.axios = axios.create({
      baseURL: this.baseUrl,
      headers: this.headers,
      timeout: 10000,
    });
  }

  getPublicURL(path) {
    return `${this.publicDomain}${path}`;
  }

  // fileOrPath: Buffer | string (path)
  async uploadFile(fileOrPath, fileName, path) {
    return new Promise((resolve, reject) => {
      let file;
      if (Buffer.isBuffer(fileOrPath)) {
        file = fileOrPath;
      } else {
        file = createReadStream(fileOrPath);
      }

      const fileN = fileName;
      if (!path.startsWith("/")) path = `/${path}`;

      const options = {
        headers: {
          "content-type": "application/octet-stream",
        },
        data: file,
      };

      this.axios
        .put(path, file, options)
        .then((res) => {
          if (res.status !== 201)
            reject(new Error(`Error uploading file: ${res.status}`));

          const data = {
            ...res.data,
            name: fileN,
            url: this.getPublicURL(path),
          };
          resolve(data);
        })
        .catch((err) => {
          reject(err.response.data);
        });
    });
  }
}

const bcdn = new BCDN(
  process.env.BUNNYCDN_API_KEY,
  process.env.BUNNYCDN_API_DOMAIN,
  process.env.BUNNYCDN_STORAGE_ZONE,
  process.env.BUNNYCDN_PUBLIC_DOMAIN
);

export default bcdn;
