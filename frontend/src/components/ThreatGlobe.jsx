import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const EARTH_TEXTURE = 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg';

const toVector = (lat, lon, radius) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta),
    );
};

function arcBetween(from, to, color) {
    const midpoint = from.clone().add(to).multiplyScalar(0.5).normalize().multiplyScalar(4.05);
    const curve = new THREE.QuadraticBezierCurve3(from, midpoint, to);
    return new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(42)),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.48 }),
    );
}

export default function ThreatGlobe({ mapData = [], attacks = [], selectedAttackId, zoom = 1, onSelectAttack }) {
    const mount = useRef(null);
    const rotation = useRef(new THREE.Euler(0.13, -0.64, 0));
    const [hovered, setHovered] = useState(null);

    useEffect(() => {
        const host = mount.current;
        if (!host) return undefined;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(42, host.clientWidth / host.clientHeight, 0.1, 100);
        camera.position.set(0, 0.15, 9.2);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(host.clientWidth, host.clientHeight);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        host.appendChild(renderer.domElement);

        const globe = new THREE.Group();
        globe.rotation.copy(rotation.current);
        globe.scale.setScalar(zoom);
        scene.add(globe);
        scene.add(new THREE.AmbientLight(0xd5e4e0, 1.85));
        const sun = new THREE.DirectionalLight(0xf1f9ed, 3.7);
        sun.position.set(5, 3, 6); scene.add(sun);
        const rim = new THREE.PointLight(0x1db7e4, 15, 16); rim.position.set(-5, 0, -1); scene.add(rim);

        const texture = new THREE.TextureLoader().load(EARTH_TEXTURE);
        texture.colorSpace = THREE.SRGBColorSpace;
        const earth = new THREE.Mesh(
            new THREE.SphereGeometry(2.88, 96, 96),
            new THREE.MeshPhongMaterial({ map: texture, color: 0xd2e2e1, shininess: 13, specular: 0x344751 }),
        );
        globe.add(earth);
        const atmosphere = new THREE.Mesh(
            new THREE.SphereGeometry(3.0, 96, 96),
            new THREE.MeshBasicMaterial({ color: 0x48d5ff, transparent: true, opacity: 0.12, side: THREE.BackSide, blending: THREE.AdditiveBlending }),
        );
        globe.add(atmosphere);

        // The quiet global mesh is deliberately separate from attack paths: it gives
        // the planet the dense operational-network texture visible in the command view.
        const networkMaterial = new THREE.LineBasicMaterial({ color: 0xa2c8c4, transparent: true, opacity: 0.16 });
        const network = new THREE.Group();
        const lineAtRadius = 3.035;
        [-55, -30, -5, 20, 45, 65].forEach((lat) => {
            const points = [];
            for (let lon = -180; lon <= 180; lon += 8) points.push(toVector(lat, lon, lineAtRadius));
            network.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), networkMaterial));
        });
        [-150, -115, -80, -45, -10, 25, 60, 95, 130, 165].forEach((lon) => {
            const points = [];
            for (let lat = -76; lat <= 76; lat += 6) points.push(toVector(lat, lon, lineAtRadius));
            network.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), networkMaterial));
        });
        const meshNodes = [];
        for (let lat = -48; lat <= 58; lat += 22) for (let lon = -160; lon <= 160; lon += 32) meshNodes.push(...toVector(lat, lon, 3.06).toArray());
        const nodeGeometry = new THREE.BufferGeometry();
        nodeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(meshNodes, 3));
        network.add(new THREE.Points(nodeGeometry, new THREE.PointsMaterial({ color: 0xe0f2ed, size: 0.022, transparent: true, opacity: 0.55 })));
        globe.add(network);

        const stars = new THREE.BufferGeometry();
        const positions = [];
        for (let i = 0; i < 650; i += 1) {
            const r = 12 + ((i * 37) % 80) / 10;
            const theta = i * 2.399963229728653;
            const y = ((i * 17) % 200) / 100 - 1;
            const ring = Math.sqrt(1 - y * y);
            positions.push(r * ring * Math.cos(theta), r * y, r * ring * Math.sin(theta));
        }
        stars.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        scene.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: 0xa9d5ef, size: 0.018, transparent: true, opacity: 0.8 })));

        const sensor = toVector(20, 77, 2.95);
        const markers = [];
        mapData.filter(point => point.lat != null && point.lon != null).forEach((point, index) => {
            const volume = Math.max(1, point.attacks || 1);
            const position = toVector(point.lat, point.lon, 2.97);
            const severityAttack = attacks.find(attack => attack.country === point.country);
            const isCritical = severityAttack?.severity === 'Critical';
            const selected = (severityAttack || attacks[index % Math.max(attacks.length, 1)])?.id === selectedAttackId;
            const color = isCritical ? 0xff4e49 : severityAttack?.severity === 'High' ? 0xf09a4f : 0xd3c06d;
            const marker = new THREE.Mesh(
                new THREE.SphereGeometry(Math.min(selected ? 0.16 : 0.115, 0.042 + Math.sqrt(volume) * 0.018), 20, 20),
                new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.96 }),
            );
            marker.position.copy(position);
            marker.userData = { point, attack: severityAttack || attacks[index % Math.max(attacks.length, 1)] };
            globe.add(marker); markers.push(marker);
            const attackArc = arcBetween(position, sensor, color); attackArc.material.opacity = selected ? 0.95 : 0.48; globe.add(attackArc);
            const ring = new THREE.Mesh(new THREE.RingGeometry(selected ? 0.13 : 0.09, selected ? 0.158 : 0.112, 32), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: selected ? 0.95 : 0.66 }));
            ring.position.copy(position); ring.lookAt(new THREE.Vector3(0, 0, 0)); globe.add(ring);
        });

        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        let dragging = false; let panning = false; let moved = false; let lastX = 0; let lastY = 0; let wheelZoom = zoom;
        const setPointer = (event) => {
            const rect = renderer.domElement.getBoundingClientRect();
            pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        };
        const pick = (event, select = false) => {
            setPointer(event); raycaster.setFromCamera(pointer, camera);
            const result = raycaster.intersectObjects(markers)[0];
            renderer.domElement.style.cursor = result ? 'pointer' : dragging ? 'grabbing' : 'grab';
            setHovered(result ? result.object.userData.point : null);
            if (select && result?.object.userData.attack) onSelectAttack?.(result.object.userData.attack);
        };
        const down = (event) => { dragging = true; panning = event.button === 2 || event.shiftKey; moved = false; lastX = event.clientX; lastY = event.clientY; renderer.domElement.style.cursor = 'grabbing'; };
        const move = (event) => {
            if (dragging) { const dx = event.clientX - lastX; const dy = event.clientY - lastY; if (Math.abs(dx) + Math.abs(dy) > 2) moved = true; if (panning) { camera.position.x = Math.max(-1.7, Math.min(1.7, camera.position.x - dx * 0.009)); camera.position.y = Math.max(-1.3, Math.min(1.5, camera.position.y + dy * 0.009)); camera.lookAt(0, 0, 0); } else { globe.rotation.y += dx * 0.006; globe.rotation.x = Math.max(-0.75, Math.min(0.75, globe.rotation.x + dy * 0.004)); } lastX = event.clientX; lastY = event.clientY; }
            else pick(event);
        };
        const up = (event) => { dragging = false; if (!moved) pick(event, true); };
        const wheel = (event) => { event.preventDefault(); wheelZoom = Math.max(0.78, Math.min(1.42, wheelZoom - event.deltaY * 0.0008)); globe.scale.setScalar(wheelZoom); };
        const preventContext = event => event.preventDefault();
        renderer.domElement.addEventListener('pointerdown', down); renderer.domElement.addEventListener('pointermove', move); renderer.domElement.addEventListener('pointerup', up); renderer.domElement.addEventListener('wheel', wheel, { passive: false }); renderer.domElement.addEventListener('contextmenu', preventContext);
        const resize = () => { camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(host.clientWidth, host.clientHeight); };
        window.addEventListener('resize', resize);
        let frame;
        const render = () => { frame = requestAnimationFrame(render); renderer.render(scene, camera); };
        render();
        return () => { rotation.current.copy(globe.rotation); cancelAnimationFrame(frame); window.removeEventListener('resize', resize); renderer.domElement.removeEventListener('pointerdown', down); renderer.domElement.removeEventListener('pointermove', move); renderer.domElement.removeEventListener('pointerup', up); renderer.domElement.removeEventListener('wheel', wheel); renderer.domElement.removeEventListener('contextmenu', preventContext); renderer.dispose(); host.contains(renderer.domElement) && host.removeChild(renderer.domElement); };
    }, [mapData, attacks, selectedAttackId, zoom, onSelectAttack]);

    return <div className="threat-globe" ref={mount} aria-label="Interactive global cyber attack visualization">
        {hovered && <div className="globe-tooltip"><span className="activity-pulse" /><div><p>{hovered.country || 'Unknown origin'}</p><small>{hovered.attacks || 1} observed attacks · click to investigate</small></div></div>}
        <div className="globe-hint">Drag to rotate · Right-drag to pan · Scroll to zoom · Select an origin to investigate</div>
    </div>;
}
