<script setup lang="ts">
import { h, onMounted } from 'vue';
import { JsPsych } from '../../utils/jsPsych/jsPsych';
import { TimelineArray } from '../../utils/jsPsych/timeline';

import Preload from '@/utils/jsPsych/plugin/Preload.vue';
import HtmlKeyboard from '@/utils/jsPsych/plugin/HtmlKeyboard.vue';
import Survey from '@/utils/jsPsych/plugin/Survey.vue';
import Instruction from '@/utils/jsPsych/plugin/Instruction.vue';
import { save_data } from '@/utils/dataSaver';

JsPsych.opts = {
    ...JsPsych.opts,
    iti: 0,
    // forceDirection: "h",
    toastClose: false
}
const jspsych = JsPsych.instance;
const timeline: TimelineArray = [];

timeline.push({
    component: h(Preload, {
        assets: [
            ["l1", "./assets/logo/logo.svg"],
            ["l2", "./assets/logo/logo_64_64.png"],
            ["l3", "./assets/logo/logo_128_128.png"],
            ["l4", "./assets/logo/logo_256_256.png"],
            ["l5", "./assets/logo/logo_512_512.png"]
        ]
    })
});

timeline.push({
    component: h(Survey)
});

const t = h("div", {}, [
    h("h1", {}, "欢迎来到jsPsych"),
    h("p", {}, "请按任意键开始")
]);
timeline.push({
    component: h(Instruction, {
        pages: [t, t, t, t]
    })
});

timeline.push({
    timeline: [{
        component() {
            return h(HtmlKeyboard, {
                stimulus: "+",
                stimulus_duration: 500,
                trial_duration_time: 1000,
            })
        }
    }, {
        component() {
            return h(HtmlKeyboard, {
                stimulus: jspsych.currTrial.getCurrId(),
                stimulus_duration: 500,
                trial_duration_time: 1000,
            })
        }
    }],
    repetitions: 5,
    conditional_function() {
        console.log("Conditional function called");
        return true;
    },
    loop_function(_) {
        console.log("Loop function called");
        return false;
    },
    timeline_variables: [
        { currId: "1" },
        { currId: "2" }
    ]
});

timeline.push({
    component: h(HtmlKeyboard, {
        stimulus: `
<div style="font-size: 48px; line-height: 96px;">实验结束</div>
<div style="font-size: 24px; color: var(--font-desc);">&copy; Mupsy 技术支持</div>`,
        choices: ["NO_KEYS"]
    }),
    on_load() {
        JsPsych.plugin.window.destoryListener();
        save_data(jspsych.data.get().csv());
    }
});

onMounted(() => {
    const expDom = document.querySelector("#exp") as HTMLDivElement;
    jspsych.load(timeline, expDom);
});
</script>

<template>
    <div id="exp"></div>
</template>

<style lang="css" scoped>
#exp {
    display: flex;
    width: 100%;
    height: 100%;
    justify-content: center;
    align-items: center;
    overflow: hidden;
}
</style>