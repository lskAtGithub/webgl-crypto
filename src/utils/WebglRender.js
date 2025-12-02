export class WebGLRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl');
    if (!this.gl) throw new Error('WebGL not supported');

    this.bgTexture = null;
    this.bgOffset = 0; // 当前背景偏移
    this.bgTargetOffset = 0; // 目标偏移
    this.sprites = [];
    this.activeSprite = null;
    this.mouseX = 0.5;

    this.initGL();
    this.resize();
    window.addEventListener('resize', this.resize.bind(this));
    this.initEvents();
  }

  initGL() {
    const gl = this.gl;

    const vs = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = vec4(a_position, 0, 1);
        v_texCoord = a_texCoord;
      }
    `;

    const fs = `
      precision mediump float;
      varying vec2 v_texCoord;
      uniform sampler2D u_texture;
      uniform float u_hover;
      uniform float u_offset;
      void main() {
        vec2 uv = v_texCoord;
        uv.x = clamp(uv.x + u_offset, 0.0, 1.0);
        vec4 color = texture2D(u_texture, uv);
        if(u_hover > 0.5) color.rgb *= 1.2;
        gl_FragColor = color;
      }
    `;

    this.program = this.createProgram(vs, fs);
    gl.useProgram(this.program);

    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

    const aPos = gl.getAttribLocation(this.program, 'a_position');
    const aUV = gl.getAttribLocation(this.program, 'a_texCoord');
    gl.enableVertexAttribArray(aPos);
    gl.enableVertexAttribArray(aUV);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 16, 8);

    this.uTexture = gl.getUniformLocation(this.program, 'u_texture');
    this.uHover = gl.getUniformLocation(this.program, 'u_hover');
    this.uOffset = gl.getUniformLocation(this.program, 'u_offset');

    // 占位透明纹理
    const emptyTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, emptyTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    this.emptyTexture = emptyTex;
  }

  createTexture(img) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return tex;
  }

  setBackground(img) {
    this.bgTexture = this.createTexture(img);
  }

  addSprite({ x, y, w, h, img, onClick, onEnter, onLeave }) {
    const sprite = {
      x,
      y,
      w,
      h,
      texture: this.createTexture(img),
      hover: false,
      onClick: onClick || (() => {}),
      onEnter: onEnter || (() => {}),
      onLeave: onLeave || (() => {})
    };
    this.sprites.push(sprite);
  }

  update() {
    // 背景目标偏移 (-0.05 ~ 0.05)
    this.bgTargetOffset = (this.mouseX - 0.5) * 0.1;
    // 缓动更新背景偏移
    this.bgOffset += (this.bgTargetOffset - this.bgOffset) * 0.1;
  }

  render() {
    const gl = this.gl;
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 背景 quad
    if (this.bgTexture) {
      this.drawQuad(this.bgTexture, 0, 0, 1, 1, 0, this.bgOffset);
    }

    // sprite quad
    for (const s of this.sprites) {
      this.drawQuad(s.texture, s.x, s.y, s.w, s.h, s.hover ? 1 : 0, 0);
    }
  }

  drawQuad(texture, x, y, w, h, hover, offset) {
    const gl = this.gl;
    const x1 = x * 2 - 1;
    const y1 = y * 2 - 1;
    const x2 = (x + w) * 2 - 1;
    const y2 = (y + h) * 2 - 1;

    const vertices = new Float32Array([x1, y1, 0, 0, x2, y1, 1, 0, x1, y2, 0, 1, x2, y2, 1, 1]);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(this.uTexture, 0);
    gl.uniform1f(this.uHover, hover);
    gl.uniform1f(this.uOffset, offset);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  resize() {
    const canvas = this.canvas;
    const gl = this.gl;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    canvas.style.width = vw + 'px';
    canvas.style.height = vh + 'px';
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(vw * dpr);
    canvas.height = Math.floor(vh * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  initEvents() {
    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX / window.innerWidth;

      const x = this.mouseX;
      const y = 1 - e.clientY / window.innerHeight;
      let hit = null;
      for (let i = this.sprites.length - 1; i >= 0; i--) {
        const s = this.sprites[i];
        if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) {
          hit = s;
          break;
        }
      }
      if (this.activeSprite !== hit) {
        if (this.activeSprite) {
          this.activeSprite.hover = false;
          this.activeSprite.onLeave();
        }
        if (hit) {
          hit.hover = true;
          hit.onEnter();
        }
        this.activeSprite = hit;
      }
    });

    window.addEventListener('click', () => {
      if (this.activeSprite) this.activeSprite.onClick();
    });
  }

  createShader(type, src) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }

  createProgram(vs, fs) {
    const gl = this.gl;
    const program = gl.createProgram();
    const vertexShader = this.createShader(gl.VERTEX_SHADER, vs);
    const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fs);
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    return program;
  }
}
