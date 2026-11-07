import asyncio
import os
from playwright.async_api import async_playwright

async def main():
    os.makedirs("scratch/screenshots", exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 720})
        page = await context.new_page()

        page.on("console", lambda msg: print(f"[Browser Console] {msg.type}: {msg.text}"))
        page.on("pageerror", lambda err: print(f"[Browser Error] {err}"))

        print("Navigating to http://localhost:5173 ...")
        await page.goto("http://localhost:5173", wait_until="networkidle")
        await page.wait_for_timeout(1000)

        # 1. Clicar no botão de iniciar jogo
        start_btn = page.locator("#btn-start")
        if await start_btn.is_visible():
            print("Clicking start game button...")
            await start_btn.click()
            await page.wait_for_timeout(1500)

        # Screenshot 1: Tela inicial com personagem e Hollows spawnando
        await page.screenshot(path="scratch/screenshots/01_gameplay_start.png")
        print("Captured 01_gameplay_start.png")

        # 2. Andar para frente (W / ArrowUp) por 1.5s
        print("Walking forward (ArrowUp)...")
        await page.keyboard.down("ArrowUp")
        await page.wait_for_timeout(1500)
        await page.keyboard.up("ArrowUp")
        await page.screenshot(path="scratch/screenshots/02_walking_forward_back_view.png")
        print("Captured 02_walking_forward_back_view.png")

        # 3. Andar para a direita (ArrowRight) por 1.5s
        print("Walking right (ArrowRight)...")
        await page.keyboard.down("ArrowRight")
        await page.wait_for_timeout(1200)
        await page.keyboard.up("ArrowRight")
        await page.screenshot(path="scratch/screenshots/03_walking_right_side_view.png")
        print("Captured 03_walking_right_side_view.png")

        # 4. Girar a câmera 180 graus usando mouse drag
        print("Dragging mouse to rotate camera ~180 degrees...")
        box = await page.locator("#game-canvas").bounding_box()
        cx = box["x"] + box["width"] / 2
        cy = box["y"] + box["height"] / 2

        await page.mouse.move(cx, cy)
        await page.mouse.down()
        # Dragging left/right rotates yaw
        await page.mouse.move(cx - 520, cy, steps=25)
        await page.mouse.up()
        await page.wait_for_timeout(1000)
        await page.screenshot(path="scratch/screenshots/04_camera_rotated_180.png")
        print("Captured 04_camera_rotated_180.png")

        # 5. Andar para frente (ArrowUp) com a câmera girada 180°
        # O personagem agora deve andar em direção ao novo ângulo da câmera
        print("Walking forward with rotated camera (ArrowUp)...")
        await page.keyboard.down("ArrowUp")
        await page.wait_for_timeout(1500)
        await page.keyboard.up("ArrowUp")
        await page.screenshot(path="scratch/screenshots/05_walking_rotated_camera.png")
        print("Captured 05_walking_rotated_camera.png")

        # 6. Andar para baixo (ArrowDown) para ver o personagem de frente
        print("Walking down (ArrowDown) towards camera...")
        await page.keyboard.down("ArrowDown")
        await page.wait_for_timeout(1500)
        await page.keyboard.up("ArrowDown")
        await page.screenshot(path="scratch/screenshots/06_walking_towards_camera_front_view.png")
        print("Captured 06_walking_towards_camera_front_view.png")

        await browser.close()
        print("Done!")

if __name__ == "__main__":
    asyncio.run(main())
