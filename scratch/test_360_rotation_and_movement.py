import asyncio
import os
from playwright.async_api import async_playwright

async def main():
    os.makedirs("scratch/screenshots", exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 720})
        page = await context.new_page()

        print("Navigating to http://localhost:5173 ...")
        await page.goto("http://localhost:5173", wait_until="networkidle")
        await page.wait_for_timeout(1000)

        # 1. Spawn inicial: aguardar 3 segundos para vários hollows spawnarem e perseguirem o jogador
        print("Waiting 3s for hollows to spawn and approach...")
        await page.wait_for_timeout(3000)

        # Captura 1: Visão inicial (yaw = 0)
        # O jogador está de costas e os hollows vindo de frente para o jogador
        await page.screenshot(path="scratch/screenshots/11_camera_yaw_0.png")
        print("Captured 11_camera_yaw_0.png")

        # 2. Girar a câmera 90 graus (tecla E várias vezes ou drag)
        print("Rotating camera 90 degrees...")
        for _ in range(10):
            await page.keyboard.press("e")
            await page.wait_for_timeout(50)
        await page.wait_for_timeout(1000)
        await page.screenshot(path="scratch/screenshots/12_camera_yaw_90_side_view.png")
        print("Captured 12_camera_yaw_90_side_view.png")

        # 3. Testar andar para frente (W / ArrowUp) com a câmera em 90 graus
        # Deve andar para o fundo da tela (eixo -X)
        print("Moving forward (W) with camera at 90 degrees...")
        pos_before = await page.evaluate("() => ({ x: window.debugGame.player.x, z: window.debugGame.player.z })")
        await page.keyboard.down("w")
        await page.wait_for_timeout(1200)
        await page.keyboard.up("w")
        pos_after = await page.evaluate("() => ({ x: window.debugGame.player.x, z: window.debugGame.player.z })")
        print(f"Position before: {pos_before}, after W: {pos_after}")
        # Com yaw = 90° (camFwdX = -1, camFwdZ = 0), andar W deve diminuir X (ir para o oeste/fundo da tela)
        delta_x = pos_after["x"] - pos_before["x"]
        print(f"Delta X (should be negative, moving into screen depth): {delta_x:.2f}")

        # 4. Girar a câmera mais 90 graus (total 180 graus)
        print("Rotating camera to 180 degrees...")
        for _ in range(11):
            await page.keyboard.press("e")
            await page.wait_for_timeout(50)
        await page.wait_for_timeout(1000)
        await page.screenshot(path="scratch/screenshots/13_camera_yaw_180_back_hollows.png")
        print("Captured 13_camera_yaw_180_back_hollows.png")

        # 5. Girar 270 graus
        print("Rotating camera to 270 degrees...")
        for _ in range(10):
            await page.keyboard.press("e")
            await page.wait_for_timeout(50)
        await page.wait_for_timeout(1000)
        await page.screenshot(path="scratch/screenshots/14_camera_yaw_270.png")
        print("Captured 14_camera_yaw_270.png")

        await browser.close()
        print("Done testing!")

if __name__ == "__main__":
    asyncio.run(main())
