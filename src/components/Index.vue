<template>
  <canvas ref="glCanvas"></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { WebGLRenderer } from '@/utils/WebglRender.js';
import bgImage from '@/assets/bg.png';

const glCanvas = ref<HTMLCanvasElement>();

onMounted(() => {
  const renderer = new WebGLRenderer(glCanvas.value!);

  const img = new Image();
  img.src = bgImage;
  img.onload = () => {
    renderer.setTexture(img);

    function loop() {
      renderer.update();
      renderer.render();
      requestAnimationFrame(loop);
    }
    loop();
  };
});
</script>
