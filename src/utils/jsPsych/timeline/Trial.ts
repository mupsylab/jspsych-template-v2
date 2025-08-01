import { nextTick, render } from "vue";
import { Parameter, TrialDescription, TrialResult, TrialResults } from ".";
import { Timeline } from "./Timeline";
import { TimelineNode } from "./TimelineNode";
import { JsPsych } from "../jsPsych";

export class Trial extends TimelineNode {
    public readonly description: TrialDescription;
    private results: TrialResults;
    private properties: TrialResult;
    private id: number;

    private trial_start_time: number = -1;
    private trial_finish_time: number = -1;

    constructor(description: TrialDescription, public readonly parent: Timeline, index: number = 0) {
        super();
        this.description = description;
        this.results = [];
        this.properties = {};
        this.id = index;
    }
    private parseParameterValue<T>(p: Parameter<T>): T {
        if(typeof p === "function") {
            return (p as Function)(this);
        } else {
            return p;
        }
    }

    setProperties(key: string, value: any) {
        this.properties[key] = value;
    }
    getProperties(key: string) {
        return this.properties[key];
    }

    reset() {
        this.properties = {};
        this.results = [];
    }
    run() {
        if (this.description.on_start) this.description.on_start(this);
        const component = this.parseParameterValue(this.description.component);
        JsPsych.plugin.timer.setTimeout(() => {
            render(component, this.parent.getDisplayDom());
            nextTick(() => {
                this.trial_start_time = JsPsych.instance.currTime;
                if (this.description.on_load) this.description.on_load(component);
            });
        }, JsPsych.opts.iti ?? 0);
    }
    pause(): void {
        JsPsych.plugin.timer.clearAllTimer();
        JsPsych.plugin.keyboard.removeAllListener();
        JsPsych.plugin.pointer.removeAllListener();
    }
    resume(): void {
        render(null, this.parent.getDisplayDom());
        nextTick(() => {
            this.run();
        });
    }
    finish(data: TrialResult) {
        JsPsych.plugin.timer.clearAllTimer();
        JsPsych.plugin.keyboard.removeAllListener();
        JsPsych.plugin.pointer.removeAllListener();

        render(null, this.parent.getDisplayDom());
        nextTick(() => {
            this.trial_finish_time = JsPsych.instance.currTime;
            Object.assign(data, {
                trial_id: this.getCurrId(),
                trial_display_time: this.trial_start_time,
                trial_destory_time: this.trial_finish_time,
                ...this.properties
            });
            if (this.description.on_finish) this.description.on_finish(data);
            this.write(data);

            this.parent.run();
        });
    }
    getIntervalTime(time: number) {
        return time - this.trial_start_time;
    }
    getCurrId() {
        return `${this.parent.getCurrId()}-${this.id}`
    }
    getResults(i: number) {
        if(i >= this.results.length) {
            return [];
        }
        return [this.results[i]];
    }
    write(data: TrialResult) {
        this.results.push(data);
        JsPsych.instance.data.write(data);
    }
}