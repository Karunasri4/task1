import crypto from "crypto"

export const getDeviceInfo=(userAgent:string,ip:string)=>{
    let operatingSystem="unknown";
    let deviceName="unknown"

    if(userAgent.includes("windows")){
        operatingSystem="windows"
    }
    else if(userAgent.includes("Mac Os")){
        operatingSystem="MacOS"
    }
    else if(userAgent.includes("Android")){
        operatingSystem="Android"
    }
    else if(userAgent.includes("iPhone")){
        operatingSystem="iOS"
    }
    else if(userAgent.includes("Linux")){
        operatingSystem="Linux"
    }

    if(userAgent.includes("Chrome")){
        deviceName="Chrome"
    }
    else if(userAgent.includes("Firefox")){
        deviceName="Firefox"
    }
    else if(userAgent.includes("Safari")){
        deviceName="Safari"
    }
    else if(userAgent.includes("Edge")){
        deviceName="Edge"
    }

    const deviceId=crypto
        .createHash("sha256")
        .update(userAgent)
        .digest("hex")
    
    return {
        deviceId,operatingSystem,deviceName
    }
}