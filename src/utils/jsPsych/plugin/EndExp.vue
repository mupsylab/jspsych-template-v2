<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { JsPsych } from '../jsPsych';
import { S3Opts, save_data } from '@/utils/dataSaver';

const props = defineProps<{
    s3?: S3Opts;
}>();

const state = ref(0);
onMounted(() => {
    const data = JsPsych.instance.data.get();
    save_data(data.csv(), props.s3)
        .then(() => {
            state.value = 1
        })
        .catch(() => {
            state.value = -1
        });
});
</script>

<template>
    <div>
        <p class="t" v-if="state === 0">数据保存中</p>
        <p class="t" v-if="state === -1">数据上传失败，请联系有关人员</p>
        <p class="t" v-if="state === 1">实验结束</p>
        <p class="c">&copy; Mupsy 技术支持</p>
    </div>
</template>

<style lang="css" scoped>
.t {
    font-size: 48px;
    line-height: 96px;
}
.c {
    font-size: 24px;
    color: var(--font-desc);
}
</style>
