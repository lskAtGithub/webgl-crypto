<template>
  <canvas ref="glCanvas"></canvas>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { WebGLRenderer } from '@/utils/webglRender.js';
import bgImg from '@/assets/bg.png';
import bcImg from '@/assets/b.png';

const glCanvas = ref(null);
let loopId;

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

    // 添加 sprite
    renderer.addSprite({
      id: 'bc',
      worldX: 20,
      worldY: 20,
      worldW: 50,
      worldH: 50,
      image: images.bc,
      onClick: () => console.log('bc clicked'),
      onHover: (hover) => console.log('bc hover:', hover)
    });

    window.addEventListener('mousemove', (e) => {
      renderer.mouseX = e.clientX / window.innerWidth;
    });

    const loop = () => {
      renderer.update();
      renderer.render();
      loopId = requestAnimationFrame(loop);
    };
    loop();
  }
});

onBeforeUnmount(() => {
  cancelAnimationFrame(loopId);
});
</script>
