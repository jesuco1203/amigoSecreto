import PocketBase from 'pocketbase';

// Conexión HTTPS a tu VPS usando nip.io
const PB_URL = 'https://db-navidad.135.181.151.188.nip.io';

export const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);

