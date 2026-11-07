import asyncio
import os
from playwright.async_api import async_playwright

async def main():
    os.makedirs("scratch/screenshots", exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 720})
        page = await context.new_page()

        page.on("console", lambda msg: print(f"[Console {msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: print(f"[Error] {err}"))

        print("Navigating to http://localhost:5173 ...")
        await page.goto("http://localhost:5173", wait_until="networkidle")
        await page.wait_for_timeout(1500)

        # 1. Verificar estado inicial do Jogador e Hollows
        # O Jogador deve estar de costas (3ª pessoa) e Hollows sempre de frente
        await page.screenshot(path="scratch/screenshots/07_player_back_hollows_front.png")
        print("Captured 07_player_back_hollows_front.png")

        # 2. Clicar no canvas para solicitar Pointer Lock
        print("Clicking canvas to activate Pointer Lock...")
        canvas = page.locator("#game-canvas")
        await canvas.click()
        await page.wait_for_timeout(500)

        # 3. Mover o mouse (simulando rotação fluida sem precisar segurar botão)
        print("Moving mouse smoothly across screen...")
        await page.mouse.move(640, 360)
        await page.mouse.move(300, 360)
        await page.wait_for_timeout(500)
        await page.screenshot(path="scratch/screenshots/08_fluid_mouse_look.png")
        print("Captured 08_fluid_mouse_look.png")

        # 4. Pressionar a tecla ESC para liberar o mouse e abrir a tela de pausa
        print("Pressing ESC to release mouse and pause...")
        await page.keyboard.press("Escape")
        await page.wait_for_timeout(800)
        await page.screenshot(path="scratch/screenshots/09_esc_pause_modal.png")
        print("Captured 09_esc_pause_modal.png")

        # 5. Clicar em RETOMAR MISSÃO para voltar ao jogo
        print("Clicking Retomar Missão...")
        resume_btn = page.locator("#btn-resume")
        if await resume_btn.is_visible():
            await resume_btn.click()
            await page.wait_for_timeout(800)
            await page.screenshot(path="scratch/screenshots/10_game_resumed.png")
            print("Captured 10_game_resumed.png")

        await browser.close()
        print("Playwright test completed successfully!")

if __name__ == "__main__":
    asyncio.run(main())
