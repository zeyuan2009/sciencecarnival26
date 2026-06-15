document.addEventListener("DOMContentLoaded", () => {
    console.log("Kiosk Terminal Registry Loaded Successfully.");
    
    // Quick system initialization message log
    const sub = document.querySelector(".subtitle");
    let toggle = true;
    
    // Subtitle blink heartbeat simulator
    setInterval(() => {
        if(toggle) {
            sub.style.borderRight = "2px solid #10b981";
        } else {
            sub.style.borderRight = "2px solid transparent";
        }
        toggle = !toggle;
    }, 600);
});