export class WebGLRenderer {
  constructor(canvas, bgWidth = 1920, bgHeight = 1080) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl');
    this.bgWidth = bgWidth;
    this.bgHeight = bgHeight;

    this.bgTexture = null;
    this.sprites = [];
    this.smokeParticles = [];
    this.smokeTexture = null;

    this.cameraX = 0;
    this.targetCameraX = 0;
    this.mouseX = 0.5;
    this.mouseY = 0.5;

    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.initShader();
    this.initBuffer();

    // 鼠标事件
    this.canvas.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX / window.innerWidth;
      this.mouseY = e.clientY / window.innerHeight;

      this.sprites.forEach((s) => {
        const scale = this.scale;
        const mx = (this.mouseX * this.canvas.width) / scale;
        const my = (this.mouseY * this.canvas.height) / scale;
        const hover = mx >= s.worldX && mx <= s.worldX + s.worldW && my >= s.worldY && my <= s.worldY + s.worldH;
        s._hover = hover;
        if (s.onHover) s.onHover(hover, s);
      });
    });

    this.canvas.addEventListener('click', (e) => {
      const scale = this.scale;
      const mx = ((e.clientX / window.innerWidth) * this.canvas.width) / scale;
      const my = ((e.clientY / window.innerHeight) * this.canvas.height) / scale;

      this.sprites.forEach((s) => {
        if (mx >= s.worldX && mx <= s.worldX + s.worldW && my >= s.worldY && my <= s.worldY + s.worldH) {
          if (s.onClick) s.onClick(s);
        }
      });
    });
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    if (!this.bgWidth || !this.bgHeight) return;

    this.scale = Math.max(this.canvas.width / this.bgWidth, this.canvas.height / this.bgHeight);
    this.viewWorldWidth = this.canvas.width / this.scale;
    this.viewWorldHeight = this.canvas.height / this.scale;
  }

  initShader() {
    const gl = this.gl;
    const vs = `
      attribute vec2 a_pos;
      attribute vec2 a_uv;
      varying vec2 v_uv;
      void main() {
        v_uv = a_uv;
        gl_Position = vec4(a_pos,0.0,1.0);
      }
    `;
    const fs = `
      precision mediump float;
      uniform sampler2D u_tex;
      uniform float u_alpha;
      uniform float u_hover;
      varying vec2 v_uv;
      void main() {
        vec4 c = texture2D(u_tex, v_uv);
        vec3 glow = c.rgb + vec3(1.0, 1.0, 1.0) * u_hover * 0.4;
        gl_FragColor = vec4(glow, c.a * u_alpha);
      }
    `;
    const vShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vShader, vs);
    gl.compileShader(vShader);

    const fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fShader, fs);
    gl.compileShader(fShader);

    this.program = gl.createProgram();
    gl.attachShader(this.program, vShader);
    gl.attachShader(this.program, fShader);
    gl.linkProgram(this.program);
    gl.useProgram(this.program);

    this.aPos = gl.getAttribLocation(this.program, 'a_pos');
    this.aUV = gl.getAttribLocation(this.program, 'a_uv');
    this.uTex = gl.getUniformLocation(this.program, 'u_tex');
    this.uAlpha = gl.getUniformLocation(this.program, 'u_alpha');
    this.uHover = gl.getUniformLocation(this.program, 'u_hover');
  }

  initBuffer() {
    this.buffer = this.gl.createBuffer();
  }

  createTexture(img) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    return tex;
  }

  setBackground(img) {
    this.bgTexture = this.createTexture(img);
    this.bgWidth = img.width;
    this.bgHeight = img.height;
    this.resize();
  }

  addSprite(sprite) {
    sprite.texture = this.createTexture(sprite.image);
    this.sprites.push(sprite);
  }

  // ✅ 确保方法挂载
  setSmokeTexture(img) {
    this.smokeTexture = this.createTexture(img);
  }

  _newParticle(x, y, isLeft) {
    return {
      x,
      y,
      vx: isLeft ? 0.15 + Math.random() * 0.1 : -0.15 - Math.random() * 0.1,
      vy: 0.05 + Math.random() * 0.05,
      size: 40 + Math.random() * 20,
      alpha: 1,
      decay: 0.002 + Math.random() * 0.002
    };
  }

  spawnSmoke() {
    const y = this.bgHeight - 50;
    const leftX = 100;
    const rightX = this.bgWidth - 200;
    this.smokeParticles.push(this._newParticle(leftX, y, true));
    this.smokeParticles.push(this._newParticle(rightX, y, false));
  }

  update() {
    const maxMove = Math.max(0, this.bgWidth - this.viewWorldWidth);
    this.targetCameraX = this.mouseX * maxMove;
    this.cameraX += (this.targetCameraX - this.cameraX) * 0.08;

    this.smokeParticles.forEach((p) => {
      p.x += p.vx;
      p.y -= p.vy;
      p.alpha -= p.decay;
    });
    this.smokeParticles = this.smokeParticles.filter((p) => p.alpha > 0);

    if (Math.random() < 0.03) this.spawnSmoke();
  }

  worldToNDC(x, y, w, h) {
    const vw = this.viewWorldWidth;
    const vh = this.viewWorldHeight;
    const sx = (x - this.cameraX) / vw;
    const sy = y / vh;
    const sw = w / vw;
    const sh = h / vh;
    const x1 = sx * 2 - 1;
    const y1 = 1 - sy * 2;
    const x2 = (sx + sw) * 2 - 1;
    const y2 = 1 - (sy + sh) * 2;
    return [x1, y1, 0, 0, x2, y1, 1, 0, x1, y2, 0, 1, x2, y2, 1, 1];
  }

  worldToNDCBackgroundFixed(x, y, w, h) {
    const vw = this.viewWorldWidth;
    const vh = this.viewWorldHeight;
    const sx = x / vw;
    const sy = y / vh;
    const sw = w / vw;
    const sh = h / vh;
    const x1 = sx * 2 - 1;
    const y1 = 1 - sy * 2;
    const x2 = (sx + sw) * 2 - 1;
    const y2 = 1 - (sy + sh) * 2;
    return [x1, y1, 0, 0, x2, y1, 1, 0, x1, y2, 0, 1, x2, y2, 1, 1];
  }

  drawWorldQuad(texture, x, y, w, h, fixed = false, alpha = 1, hover = false) {
    const gl = this.gl;
    const data = fixed ? this.worldToNDCBackgroundFixed(x, y, w, h) : this.worldToNDC(x, y, w, h);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

    gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aUV, 2, gl.FLOAT, false, 16, 8);
    gl.enableVertexAttribArray(this.aUV);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(this.uTex, 0);
    gl.uniform1f(this.uAlpha, alpha);
    gl.uniform1f(this.uHover, hover ? 1.0 : 0.0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  render() {
    const gl = this.gl;
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 背景 -> 缓动
    if (this.bgTexture) this.drawWorldQuad(this.bgTexture, 0, 0, this.bgWidth, this.bgHeight, false);

    // sprite -> 固定在背景
    for (const s of this.sprites) {
      this.drawWorldQuad(s.texture, s.worldX, s.worldY, s.worldW, s.worldH, true, 1, !!s._hover);
    }

    // 烟雾粒子 -> 固定在背景
    for (const p of this.smokeParticles) {
      if (this.smokeTexture) this.drawWorldQuad(this.smokeTexture, p.x, p.y, p.size, p.size, true, p.alpha);
    }
  }
}
