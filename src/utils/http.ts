import axios, { type AxiosRequestConfig } from "axios";

const Base_URL = `http://127.0.0.1:8000/api`;
axios.defaults.baseURL = Base_URL;

axios.interceptors.request.use((config: AxiosRequestConfig | any) => config);
axios.interceptors.response.use(
  (res) => {
    return res;
  },
  (err) => {
    return Promise.reject(err);
  }
);

// Type

interface IHttp {
  get<T>(url: string, params?: unknown): Promise<T>;
  post<T>(url: string, body?: unknown): Promise<T>;
  getBlob<T>(url: string, params?: unknown): Promise<T>;
}

const http: IHttp = {
  get(url, params) {
    return new Promise((resolve, reject) => {
      axios
        .get(url, { params })
        .then((res) => {
          resolve(res.data);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  getBlob(url, params) {
    return new Promise((resolve, reject) => {
      axios
        .get(url, { params, responseType: "blob" })
        .then((res) => {
          
          const x_header_str = res.headers["x-volume"]
          if (!!x_header_str){
            const x_header_obj = JSON.parse(x_header_str) 
            resolve(Object.assign({data:res.data, x_header_obj}));
          }else{
            resolve(res.data);
          }
          
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  post(url, body) {
    return new Promise((resolve, reject) => {
      axios
        .post(url, body)
        .then((res) => {
          resolve(res.data);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
};

export default http;
