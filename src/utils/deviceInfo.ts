import crypto from "crypto";

export const getDeviceInfo = (
    userAgent: string,
    ip: string
) => {

    const ua = userAgent.toLowerCase();

    let operatingSystem = "Unknown";
    let deviceName = "Unknown";

    // Operating system
    if (ua.includes("windows")) {
        operatingSystem = "Windows";
    }
    else if (ua.includes("android")) {
        operatingSystem = "Android";
    }
    else if (ua.includes("iphone") || ua.includes("ipad")) {
        operatingSystem = "iOS";
    }
    else if (ua.includes("mac os")) {
        operatingSystem = "MacOS";
    }
    else if (ua.includes("linux")) {
        operatingSystem = "Linux";
    }

    // Browser
    if (ua.includes("edg")) {
        deviceName = "Edge";
    }
    else if (ua.includes("chrome")) {
        deviceName = "Chrome";
    }
    else if (ua.includes("firefox")) {
        deviceName = "Firefox";
    }
    else if (ua.includes("safari")) {
        deviceName = "Safari";
    }

    const deviceId = crypto
        .createHash("sha256")
        .update(userAgent)
        .digest("hex");

    return {
        deviceId,
        operatingSystem,
        deviceName
    };
};