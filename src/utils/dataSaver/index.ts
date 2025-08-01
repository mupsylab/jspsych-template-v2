import { JsPsych } from "../jsPsych/jsPsych";
import Naodao from "./naodao";

const mode = import.meta.env.MODE;
const naodao = mode == "naodao" ? new Naodao() : undefined;

export function save_data(csv: string) {
    switch(mode) {
        case "naodao":
            if (!naodao) return;
            naodao.getData = () => { return csv; }
            naodao.save();
            break;
        case "development":
            // 开发者模式不保存
            break;
        default:
            // 在实验结束时自动下载数据
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${JsPsych.instance.currTime}_exp_data.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
    }
}