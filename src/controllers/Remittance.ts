import { Response, Request, NextFunction } from 'express';
import Remittance, { IRemittance } from '../models/Remittance';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { number } from 'joi';import mongoose from 'mongoose';


const algorithm = 'aes-256-cbc';
const secretKey = 'vOVH6sdmpNWjRRIqCc7rdxs01lwHzfr3'; // Recuerda cambiar esto por tu propia clave secreta
const iv = crypto.randomBytes(16); // IV debe ser de 16 bytes


const saltRounds = 10;

const create = async (req: Request, res: Response, next: NextFunction) => {
    const identifier = await Remittance.countDocuments()+1
    const {user_email, card, full_name, phone_number, amount, currency, budget, budget_currency} = req.body;
    let encryptedCard = encrypt(card); // encriptar la tarjeta

    const remittance = new Remittance({ identifier, user_email, card: encryptedCard, full_name, phone_number, amount, currency, budget, budget_currency });

    return remittance
        .save()
        .then((remittance: IRemittance) => res.status(201).json({ remittance }))
        .catch((error) => res.status(500).json({ error }));
};


const update = (req: Request, res: Response, next: NextFunction) => {
    const remittanceId = req.params.id;
    return Remittance.findOneAndUpdate({ identifier: remittanceId }, req.body)
        .then((remittance) => (remittance ? res.status(201).json({ remittance }) : res.status(404).json({ message: 'Not found' })))
        .catch((error) => res.status(500).json({ error }));
};

const search = async (req: Request, res: Response, next: NextFunction) => {
    let { page = 1, pageSize = 20, process_status } = req.query;
    page = Number(page);
    pageSize = Number(pageSize);

    // Asegurarse de que page y pageSize sean números. Si no, establecer a los valores predeterminados.
    if (isNaN(page) || page <= 0) {
        page = 1;
    }
    if (isNaN(pageSize) || pageSize <= 0) {
        pageSize = 20;
    }

    const query = process_status ? { process_status } : {}; // Si status está definido, incluirlo en el query

    // Obtén el total de documentos
    const totalDocuments = await Remittance.countDocuments(query);

    Remittance.find(query)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .then((remittances) => {
            remittances = remittances.map(remittance => {
                remittance.card = decrypt(remittance.card); // desencriptar la tarjeta
                return remittance;
            });

            // Calcular el total de páginas
            const totalPages = Math.ceil(Number(totalDocuments) / Number(pageSize));

            res.status(200).json({ 
                totalDocuments,
                totalPages,
                currentPage: page,
                remittances
            });
        })
        .catch((error) => res.status(500).json({ error }));
};


const ITEMS_PER_PAGE = 20;

const filter = async (req: Request, res: Response, next: NextFunction) => {
    let { process_status, startDate, endDate, currency, budget_currency, phone_number, source_reference } = req.body;
    let { page = 1, pageSize = 20 } = req.query;

    let localDate = new Date(startDate);  // Convert string to Date object
    startDate = new Date(Date.UTC(localDate.getFullYear(), localDate.getMonth(), localDate.getDate(), 0, 0, 0));  // Convert to UTC

    localDate = new Date(endDate);  // Convert string to Date object
    endDate = new Date(Date.UTC(localDate.getFullYear(), localDate.getMonth(), localDate.getDate(), 23, 59, 59));  // Convert to UTC

    page = Number(page);
    pageSize = Number(pageSize);

    // Asegurarse de que page y pageSize sean números. Si no, establecer a los valores predeterminados.
    if (isNaN(page) || page <= 0) {
        page = 1;
    }
    if (isNaN(pageSize) || pageSize <= 0) {
        pageSize = 20;
    }

    // Crea el objeto de filtro
    let filter: any = {};
    if (process_status) {
        filter['process_status'] = process_status; // Estado del proceso
    }
    if (startDate && endDate) {
        filter['createdAt'] = {
            $gte: new Date(startDate), // Mayor o igual que startDate
            $lte: new Date(endDate) // Menor o igual que endDate
        };
    }
    if (currency) {
        filter['currency'] = currency; // Estado del proceso
    }
    if (budget_currency) {
        filter['budget_currency'] = budget_currency; // Estado del proceso
    }
    if (source_reference) {
        filter['source_reference'] = source_reference; // Estado del proceso
    }
    // Obtén el total de documentos
    const totalDocuments = await Remittance.countDocuments(filter);

    Remittance.find(filter)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .then((remittances) => {
            remittances = remittances.map(remittance => {
                remittance.card = decrypt(remittance.card); // desencriptar la tarjeta
                return remittance;
            });

            // Calcular el total de páginas
            const totalPages = Math.ceil(Number(totalDocuments) / Number(pageSize));

            res.status(200).json({ 
                totalDocuments,
                totalPages,
                currentPage: page,
                remittances
            });
        })
        .catch((error) => res.status(500).json({ error }));
};


export default {
    create,
    update,
    search,
    filter
};






const encrypt = (text: string) => {
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);

    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
};

const decrypt = (encryptedText:string) => {
    let [iv, encrypted] = encryptedText.split(':');
    const decipher = crypto.createDecipheriv(algorithm, secretKey, Buffer.from(iv, 'hex'));

    const decrypted = Buffer.concat([decipher.update(Buffer.from(encrypted, 'hex')), decipher.final()]);

    return decrypted.toString();
};