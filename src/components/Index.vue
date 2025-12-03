<template>
  <div class="canvas-wrapper">
    <canvas ref="glCanvas"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { WebGLRenderer } from '@/utils/webglRender.js';
import bgImg from '@/assets/bg.png';
import bcImg from '@/assets/b.png';

const glCanvas = ref(null);

onMounted(() => {
  const renderer = new WebGLRenderer(glCanvas.value, 1920, 1080);

  const images = { bg: new Image(), bc: new Image() };
  images.bg.src = bgImg;
  images.bc.src = bcImg;

  let loaded = 0;
  Object.values(images).forEach((img) => {
    img.onload = () => {
      loaded++;
      if (loaded === Object.keys(images).length) start();
    };
  });

  function start() {
    renderer.setBackground(images.bg);

    renderer.addSprite({
      id: 'bc',
      worldX: 1400,
      worldY: 500,
      worldW: 300,
      worldH: 180,
      image: images.bc
    });

    function loop() {
      renderer.update();
      renderer.render();
      requestAnimationFrame(loop);
    }
    loop();
  }
});
</script>

<style scoped>
.canvas-wrapper {
  width: 1200px;
}
</style>
