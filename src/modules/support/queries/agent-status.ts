'use server'

function demoApi() {
    return {
        getAgentStatus: () => {
            return {
                status: 'online',
            }
        }
    }
}

export async function getAgentStatus() {
    const api = demoApi()
    const agentStatus = api.getAgentStatus()
    return agentStatus
}