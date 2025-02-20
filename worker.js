self.addEventListener("message", (event) => {
    if (event.data.type === "start") {
        console.log("🔄 Web Worker начал фоновое обновление токена");

        // Сохраняем refresh-токен в переменную
        self.refreshToken = event.data.refreshToken;

        setInterval(() => {
            refreshTokenInBackground();
        }, 600000); // 5 минут
    }

    if (event.data.type === "updateToken") {
        console.log("🔄 Web Worker получил обновленный refreshToken");
        self.refreshToken = event.data.refreshToken; // Обновляем токен
    }
});

async function refreshTokenInBackground() {
    if (!self.refreshToken) {
        console.error("❌ Ошибка: Refresh token отсутствует, уведомляем главный поток.");
        self.postMessage("logout");
        return;
    }

    try {
        const response = await fetch("https://directus.nplanner.ru/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: self.refreshToken })
        });

        const data = await response.json();

        if (response.ok && data.data?.access_token) {
            console.log("✅ Access token обновлён в фоне!");

            // Сообщаем главному потоку новый access_token и refresh_token
            self.postMessage({
                type: "tokenUpdated",
                accessToken: data.data.access_token,
                refreshToken: data.data.refresh_token,
                expires: Date.now() + data.data.expires
            });
        } else {
            console.error("❌ Ошибка обновления токена в фоне:", data);
            self.postMessage("logout"); // Уведомляем главный поток о разлогине
        }
    } catch (error) {
        console.error("❌ Ошибка сети при обновлении токена в фоне:", error);
        self.postMessage("logout"); // Уведомляем главный поток о разлогине
    }
}
