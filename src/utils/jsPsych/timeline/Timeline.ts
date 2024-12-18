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
            (item, index) => Object.hasOwn(item, "timeline") ? new Timeline(item as TimelineDescription, this, index) : new Trial(item as TrialDescription, this, index)
        );
        this.timeline_variables = this.generateTimelineVariableOrder();
        this.reset();
    }

    reset() {
        this.cursor_node = 0;
        this.cursor_variable = 0;
        this.cursor_repetition = 0;
        this.timeline_variables = this.generateTimelineVariableOrder();

        for (const childNode of this.childNodes) {
            childNode.reset();
        }
        this.status = TimelineNodeStatus.RUNNING;
    }
    run() {
        if (this.status !== TimelineNodeStatus.RUNNING) {
            // 当前时间线已结束
            if(this.parent instanceof Timeline) {
                this.parent.nextRun();
            }
            return 0;
        }
        const { conditional_function } = this.description;
        if (!conditional_function || conditional_function()) {
            if (this.description.on_timeline_start) this.description.on_timeline_start();

            this.childNodes[this.cursor_node].run();

            if (this.description.on_timeline_finish) this.description.on_timeline_finish();
        } else {
            // 条件不通过, 结束运行
            this.status = TimelineNodeStatus.ABORTED;
            if(this.parent instanceof Timeline) {
                this.parent.nextRun();
            }
        }
    }
    next() {
        if (this.status !== TimelineNodeStatus.RUNNING) return 0;
        const { loop_function, repetitions = 1 } = this.description;
        this.cursor_node += 1;
        if (this.cursor_node >= this.childNodes.length) {
            // 一轮完毕
            this.cursor_node = 0;
            this.cursor_variable += 1;
            if (this.cursor_variable && this.cursor_variable % this.timeline_variables.length === 0) {
                // 变量循环完毕
                this.cursor_variable = 0;
                this.cursor_repetition += 1;
                if (this.cursor_repetition >= repetitions) {
                    if (loop_function && loop_function(new DataCollection(this.getResults()))) {
                        for (const child of this.childNodes) {
                            child.reset();
                        }
                        this.reset();
                        return 0;
                    }

                    this.status = TimelineNodeStatus.COMPLETED;
                    return 0;
                }
                this.timeline_variables = this.generateTimelineVariableOrder();
            }
        }
    }
    nextRun() {
        this.next();
        this.run();
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
            ...this.description.timeline_variables ? this.description.timeline_variables[this.cursor_variable] : {}
        };
    }
}
