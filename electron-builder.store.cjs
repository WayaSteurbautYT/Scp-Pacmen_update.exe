const identityName = process.env.STORE_IDENTITY_NAME?.trim();
const publisher = process.env.STORE_PUBLISHER?.trim();

if (!identityName || !publisher) {
  throw new Error(
    "Store package identity is missing. Copy STORE_IDENTITY_NAME and STORE_PUBLISHER from Partner Center > Product management > Product identity, then rerun npm run build:windows:store.",
  );
}

module.exports = {
  appId: "studio.waya.scppac.update",
  productName: "SCP-PAC_UPDATE",
  directories: { output: "release" },
  files: ["dist/**", "electron/**", "server/**", "assets/**", "package.json"],
  win: {
    icon: "assets/Scp-PAC_Update.exe.svg",
    target: ["appx"],
  },
  appx: {
    identityName,
    publisher,
    publisherDisplayName: "WayaCreate Studios",
    applicationId: "SCP.PAC.Update",
    displayName: "SCP-PAC",
    backgroundColor: "#07111c",
    capabilities: ["runFullTrust", "internetClient", "privateNetworkClientServer", "microphone"],
  },
  artifactName: "SCP-PAC_${version}_${arch}.${ext}",
};
