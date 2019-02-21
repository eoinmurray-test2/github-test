
module.exports = (plan) => {
  if (plan === "data-scientist-v1") {
    return {
      "multiple-workspaces": true,
      "private-studies": true,
      "workspace-hours": 200,
      "max-lifetime-per-workspace": false,
      cpu: "1024",
      memory: "1960"
    }
  }

  return {
    "multiple-workspaces": false,
    "private-studies": false,
    "workspace-hours": 10,
    "max-lifetime-per-workspace": 3,
    cpu: "512",
    memory: "980"
  }
}
