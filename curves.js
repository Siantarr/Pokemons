// LINEAR DAN POLYNOMIAL
export function line(t) { return [t, 0, 0]; }
export function parabola(t) { return [t, t * t, 0]; }
export function cubic(t) { return [t, t * t * t, 0]; }

// CIRCLE DAN ELLIPSE
export function circle(t, r = 1) { return [r * Math.cos(t), r * Math.sin(t), 0]; }
export function ellipse(t, a = 1, b = 0.5) { return [a * Math.cos(t), b * Math.sin(t), 0]; }

// SPIRAL FAMILY
export function spiralArchimedean(t, a = 0.1, b = 0.2) {
    return [(a + b * t) * Math.cos(t), (a + b * t) * Math.sin(t), 0];
}
export function logarithmicSpiral(t, a = 0.1, b = 0.2) {
    const r = a * Math.exp(b * t);
    return [r * Math.cos(t), r * Math.sin(t), 0];
}

// TRIGONOMETRIC SPECIAL
export function sineWave(t, amp = 1, freq = 1) { return [t, amp * Math.sin(freq * t), 0]; }
export function cosineWave(t, amp = 1, freq = 1) { return [t, amp * Math.cos(freq * t), 0]; }
export function lissajous(t, a = 1, b = 1, A = 1, B = 1, delta = Math.PI / 2) {
    return [A * Math.sin(a * t + delta), B * Math.sin(b * t), 0];
}

// CYCLOID FAMILY
export function cycloid(t, r = 1) {
    return [r * (t - Math.sin(t)), r * (1 - Math.cos(t)), 0];
}
export function hypocycloid(t, R = 5, r = 3) {
    return [
        (R - r) * Math.cos(t) + r * Math.cos((R - r) / r * t),
        (R - r) * Math.sin(t) - r * Math.sin((R - r) / r * t),
        0
    ];
}
export function epicycloid(t, R = 5, r = 3) {
    return [
        (R + r) * Math.cos(t) - r * Math.cos((R + r) / r * t),
        (R + r) * Math.sin(t) - r * Math.sin((R + r) / r * t),
        0
    ];
}

// LEMNISCATES
export function lemniscateBernoulli(t, a = 1) {
    const denom = 1 + Math.sin(t) * Math.sin(t);
    const r = (a * Math.sqrt(2) * Math.cos(t)) / denom;
    return [r * Math.cos(t), r * Math.sin(t), 0];
}
export function lemniscateGerono(t, a = 1) {
    return [a * Math.cos(t), a * Math.sin(t) * Math.cos(t), 0];
}

// 3D CURVES
export function helixCurve(t = 2, r = 1, pitch = 0.2) {
    return [r * Math.cos(t), r * Math.sin(t), pitch * t];
}
export function sphericalSpiral(t, a = 0.2) {
    const theta = t;
    const phi = a * t;
    return [Math.cos(phi) * Math.cos(theta), Math.cos(phi) * Math.sin(theta), Math.sin(phi)];
}
export function trefoilKnot(t, R = 2, r = 0.5) {
    return [
        Math.sin(t) + 2 * Math.sin(2 * t),
        Math.cos(t) - 2 * Math.cos(2 * t),
        -Math.sin(3 * t)
    ];
}

// Cubic Bezier
export function cubicBezier3D(p0, p1, p2, p3) {
    return function (t) {
        const u = 1 - t;
        const uu = u * u;
        const uuu = uu * u;
        const tt = t * t;
        const ttt = tt * t;

        const x = uuu * p0[0] + 3 * uu * t * p1[0] + 3 * u * tt * p2[0] + ttt * p3[0];
        const y = uuu * p0[1] + 3 * uu * t * p1[1] + 3 * u * tt * p2[1] + ttt * p3[1];
        const z = uuu * p0[2] + 3 * uu * t * p1[2] + 3 * u * tt * p2[2] + ttt * p3[2];

        return [x, y, z];
    };
}

//TAMBAHAN

// B-Spline Curve
export function generateBSpline(controlPoints, degree = 3, t) {
    const n = controlPoints.length - 1;
    const knots = [];
    for (let i = 0; i <= n + degree + 1; i++) {
        knots.push(i / (n + degree + 1));
    }

    function basis(i, p, u) {
        if (p === 0) {
            return (u >= knots[i] && u < knots[i + 1]) ? 1 : 0;
        }
        const d1 = knots[i + p] - knots[i];
        const d2 = knots[i + p + 1] - knots[i + 1];
        const t1 = d1 === 0 ? 0 : ((u - knots[i]) / d1) * basis(i, p - 1, u);
        const t2 = d2 === 0 ? 0 : ((knots[i + p + 1] - u) / d2) * basis(i + 1, p - 1, u);
        return t1 + t2;
    }

    let x = 0, y = 0, z = 0;
    for (let i = 0; i <= n; i++) {
        const b = basis(i, degree, t);
        x += b * controlPoints[i][0];
        y += b * controlPoints[i][1];
        z += b * controlPoints[i][2];
    }
    return [x, y, z];
}

export function bSplineCurve(controlPoints, degree = 3) {
    return function (t) {
        return generateBSpline(controlPoints, degree, t);
    };
}
