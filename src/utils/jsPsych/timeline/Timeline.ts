import { TimelineArray, TimelineDescription, TimelineNodeStatus, TrialDescription, TrialResults } from ".";
import { DataCollection } from "../module/data/DataCollection";
import { repeat, sampleWithoutReplacement, sampleWithReplacement, shuffle, shuffleAlternateGroups } from "../module/randomization";
import { TimelineNode } from "./TimelineNode";
import { Trial } from "./Trial";

export class Timeline extends TimelineNode {
    public readonly description: TimelineDescription;
    private childNodes: TimelineNode[];
    private timeline_variables: number[]; // 变量的顺序
    private id: number;

    private status: TimelineNodeStatus = TimelineNodeStatus.PENDING;
    private cursor_node: number = 0; // 试次的顺序
    private cursor_variable: number = 0; // 变量的顺序
    private cursor_repetition: number = 0; // 循环的顺序

    constructor(
        description: TimelineDescription | TimelineArray,
        public readonly parent?: Timeline | HTMLElement,
        id: number = 0
    ) {
        super();

        this.id = id;
        this.description = Array.isArray(description) ? { timeline: description } : description;
        this.childNodes = this.description.timeline.map(
            (item, index) => item.hasOwnProperty("timeline") ? new Timeline(item as TimelineDescription, this, index) : new Trial(item as TrialDescription, this, index)
        );
        this.timeline_variables = this.generateTimelineVariableOrder();
        this.reset();
    }

    private resetChild() {
        for (const childNode of this.childNodes) {
            childNode.reset();
        }
    }
    reset() {
        this.cursor_node = -1;
        this.cursor_variable = 0;
        this.cursor_repetition = 0;
        this.timeline_variables = this.generateTimelineVariableOrder();

        this.resetChild();
        this.status = TimelineNodeStatus.RUNNING;
    }
    run() {
        this.next();
        if (this.status === TimelineNodeStatus.COMPLETED) {
            // 当前时间线已完成
            if (this.parent instanceof Timeline) {
                this.parent.run();
            }
            return 0;
        }
        if (this.status !== TimelineNodeStatus.RUNNING) {
            // 当前时间线没运行
            return 0;
        }
        this.childNodes[this.cursor_node].run();
    }
    next() {
        if (this.status !== TimelineNodeStatus.RUNNING) {
            // 当前时间线已暂停
            return 0;
        }
        const { conditional_function, loop_function, repetitions = 1 } = this.description;
        if (this.cursor_node === -1) {
            if (!(!conditional_function || conditional_function())) {
                // 如果有条件函数, 且条件函数返回 false, 则不执行下一步
                if(this.parent instanceof Timeline) {
                    this.parent.run();
                }
    
                this.status = TimelineNodeStatus.ABORTED;
                return 0;
            }
            if (this.description.on_timeline_start) this.description.on_timeline_start();
            this.cursor_node = 0; // 初始化试次
            this.resetChild();
            return 0;
        }
        this.cursor_node += 1; // 试次增加
        if (this.cursor_node >= this.childNodes.length) {
            // 一轮完毕
            this.cursor_node = 0;
            this.cursor_variable += 1;
            if (this.cursor_variable && this.cursor_variable % this.timeline_variables.length === 0) {
                // 变量循环完毕
                this.cursor_variable = 0;
                this.cursor_repetition += 1;
                this.resetChild();
                if (this.cursor_repetition >= repetitions) {
                    if (loop_function && loop_function(new DataCollection(this.getResults()))) {
                        this.reset();
                        this.cursor_node = 0;
                        return 0;
                    }

                    if (this.description.on_timeline_finish) this.description.on_timeline_finish();
                    this.status = TimelineNodeStatus.COMPLETED;
                    return 0;
                }
                this.timeline_variables = this.generateTimelineVariableOrder();
            }
        }
    }
    getCurrId(): string {
        let id = [];
        if (this.parent instanceof Timeline) {
            id.push(...this.parent.getCurrId().split("-"));
        }
        id.push(`${this.id}.${this.cursor_repetition}.${this.cursor_variable}`);
        return id.join("-");
    }
    getTopTimeline(): Timeline {
        if (this.parent instanceof Timeline) {
            return this.parent.getTopTimeline();
        }
        return this;
    }
    getActivateTrial(): Trial {
        const childNode = this.childNodes[this.cursor_node];
        if (childNode instanceof Timeline) return childNode.getActivateTrial();
        return childNode as Trial;
    }
    getStatus() {
        return this.status;
    }
    getResults() {
        const results: TrialResults = [];
        const { repetitions = 1 } = this.description;
        for (let j = 0; j < repetitions; j++) {
            for (let i = 0; i < this.timeline_variables.length; i++) {
                for (const child of this.childNodes) {
                    if (child instanceof Trial) {
                        // 如果为试次的话, 则取出指定位置的结果
                        results.push(...child.getResults(
                            j * this.timeline_variables.length + i
                        ));
                    }

                    if (child instanceof Timeline) {
                        // 如果为时间线的话, 则取出全部的结果
                        results.push(...child.getResults());
                    }
                }
            }
        }
        return results;
    }
    getDisplayDom(): Element {
        if (this.parent instanceof Timeline) {
            return this.parent.getDisplayDom();
        }
        return this.parent as Element;
    }
    private generateTimelineVariableOrder() {
        const timelineVariableLength = this.description.timeline_variables?.length;
        if (!timelineVariableLength) { return [-1]; }

        let order = [...Array(timelineVariableLength).keys()];
        const sample = this.description.sample;

        if (sample) {
            switch (sample.type) {
                case "custom":
                    order = sample.fn(order);
                    break;

                case "with-replacement":
                    order = sampleWithReplacement(order, sample.size, sample.weights);
                    break;

                case "without-replacement":
                    order = sampleWithoutReplacement(order, sample.size);
                    break;

                case "fixed-repetitions":
                    order = repeat(order, sample.size);
                    break;

                case "alternate-groups":
                    order = shuffleAlternateGroups(sample.groups, sample.randomize_group_order);
                    break;
            }
        }

        if (this.description.randomize_order) {
            order = shuffle(order);
        }

        return order;
    }
    public getAllTimelineVariables(): Record<string, any> {
        return {
            ...this.parent instanceof Timeline ? this.parent.getAllTimelineVariables() : {},
            ...this.description.timeline_variables ? this.description.timeline_variables[this.timeline_variables[this.cursor_variable]] : {}
        };
    }
    pause() {
        if (this.status === TimelineNodeStatus.RUNNING) {
            this.status = TimelineNodeStatus.PAUSED;
            this.childNodes[this.cursor_node].pause();
        }
    }
    resume(): void {
        if (this.status === TimelineNodeStatus.PAUSED) {
            this.status = TimelineNodeStatus.RUNNING;
            this.childNodes[this.cursor_node].resume();
        }
    }
}
