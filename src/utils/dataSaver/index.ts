import { JsPsych } from "../jsPsych/jsPsych";
import Naodao from "./naodao";
import { save_s3 } from "./s3";

const mode = import.meta.env.MODE;
const naodao = mode == "naodao" ? new Naodao() : undefined;
type S3Opts = {
    accessKey: string,
    secretKey: string,
    bucket: string,
    endpoint: string,
    region: string,
    fileName: string
}
export function save_data(csv: string, opts: S3Opts | undefined) {
    return new Promise((resolve, reject) => { 
        switch(mode) {
            case "naodao":
                if (!naodao) return;
                naodao.getData = () => { return csv; }
                naodao.save().then(resolve).catch(reject);
                break;
            case "development":
                // 开发者模式不保存
                resolve(true);
                break;
            case "s3":
                // 使用s3上传
                if (!opts) {
                    offline(csv);
                    resolve(false);
                    return;
                }
                save_s3({
                    csv,
                    ...opts
                }).then(resolve).catch(reject);
                break;
            default:
                // 在实验结束时自动下载数据
                offline(csv);
                resolve(true);
        }
    });
}

function offline(csv: string) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${JsPsych.instance.currTime}_exp_data.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}