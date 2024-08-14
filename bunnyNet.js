import axios, { AxiosInstance } from "axios";
import { createReadStream } from "fs";

import uniqueNameGenerator from "./uniqueNameGenerator";
import checkFileType from "./checkFileType";

const httpMode = process.env.BUNNYCDN_HTTP_MODE || "https";

// TODO - Check if this is working with the whole project
class BCDN {
  headers;
  imageFolder;
  otherFolder;
  videoFolder;
  publicDomain;
  baseUrl;
  axios;

  constructor(
    apiKey,
    baseURLDomain,
    storageZone,
    imageFolder,
    videoFolder,
    otherFolder,
    publicDomain,
    storageZoneRegion = "de"
  ) {
    this.headers = {
      AccessKey: apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    this.imageFolder = imageFolder;
    this.otherFolder = otherFolder;
    this.videoFolder = videoFolder;
    this.publicDomain = publicDomain;

    if (storageZoneRegion === "de" || storageZoneRegion === "") {
      this.baseUrl = `${httpMode}://${baseURLDomain}/${storageZone}`;
    } else {
      this.baseUrl = `${httpMode}://${storageZoneRegion}.${baseURLDomain}/${storageZone}`;
    }

    this.axios = axios.create({
      baseURL: this.baseUrl,
      headers: this.headers,
      timeout: 10000,
    });
  }

  getPath(fileName) {
    const fileType = checkFileType(fileName);
    let fileN = fileName;
    if (fileName.startsWith("/")) {
      fileN = fileN.substring(1);
    }
    if (fileType === "image") {
      return `${this.imageFolder}/${fileN}`;
    }
    if (fileType === "video") {
      return `${this.videoFolder}/${fileN}`;
    }
    return `${this.otherFolder}/${fileN}`;
  }

  getPublicURL(path) {
    return `${this.publicDomain}${path}`;
  }

  async deleteFile(fileName) {
    return new Promise((resolve, reject) => {
      if (fileName === undefined) reject(new Error("No file name provided"));

      const path = this.getPath(fileName);
      this.axios
        .delete(path)
        .then((res) => {
          if (res.status !== 200)
            reject(new Error(`Error deleting file: ${res.status}`));
          resolve(res.data);
        })
        .catch((err) => {
          reject(err.response.data);
        });
    });
  }

  async downloadFile(fileName) {
    return new Promise((resolve, reject) => {
      if (fileName === undefined) reject(new Error("No file name provided"));

      const path = this.getPath(fileName);
      this.axios
        .get(path)
        .then((res) => {
          if (res.status !== 200)
            reject(new Error(`Error downloading file: ${res.status}`));
          resolve(res.data);
        })
        .catch((err) => {
          reject(err.response.data);
        });
    });
  }

  // fileOrPath: Buffer | string (path)
  async uploadFile(fileOrPath, fileName) {
    return new Promise((resolve, reject) => {
      let file;
      if (Buffer.isBuffer(fileOrPath)) {
        file = fileOrPath;
      } else {
        file = createReadStream(fileOrPath);
      }

      const fileN = uniqueNameGenerator(fileName, Date.now());
      const path = this.getPath(fileN);
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
  process.env.BUNNYCDN_API_PATH_IMAGES,
  process.env.BUNNYCDN_API_PATH_VIDEOS,
  process.env.BUNNYCDN_API_PATH_RAW,
  process.env.BUNNYCDN_PUBLIC_DOMAIN
);

export default bcdn;
