<template>
  <canvas ref="glCanvas"></canvas>
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
      x: 0.425,
      y: 0.3,
      w: 0.15,
      h: 0.08,
      img: images.bc,
      onClick() {
        console.log('bc clicked');
      },
      onEnter() {
        console.log('bc hover');
      },
      onLeave() {
        console.log('bc leave');
      }
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
