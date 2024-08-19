'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth'
import { AuthError } from 'next-auth';
 
const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({invalid_type_error: 'Please select a customer'}),
    amount: z.coerce.number().gt(0, {message: 'Please enter an amount greater than $0'}),
    status: z.enum(['pending', 'paid'],{invalid_type_error: 'Please select Invoice status'}),
    date: z.string()
});

export type State = {
    errors?: {
        customerId? : string[];
        amount?: string[];
        status?: string[];
    }
    message?: string | null;
}

const CreateInvoice = FormSchema.omit({id: true, date: true});

const UpdateInVoice = FormSchema.omit({id: true, date: true});

export async function authenticate(prevState: string | undefined, formData : FormData){
    try {
        await signIn('credentials', formData);
    } catch (error) {
        if(error instanceof AuthError){
            switch(error.type){
                case 'CredentialsSignin' : return 'Invalid Credentials';
                default:
                    return "Something Went wrong";
            }
        }
    }
}


export async function updateInvoice( id: string, prevState: State, formData: FormData){
    
    const validateUpdatedData = UpdateInVoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });
    if(!validateUpdatedData.success){
        return{
            errors: validateUpdatedData.error.flatten().fieldErrors, message: 'Update Form not correctly filled'
        }
    }

    const { customerId, amount , status} = UpdateInVoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    const amountInCents = amount * 100;
    try {
        await sql `UPDATE invoices SET customer_id=${customerId}, amount=${amountInCents}, status=${status} WHERE id= ${id}`;
        revalidatePath('/dashboard/invoices');
        redirect('/dashboard/invoices');
    } catch (error) {
        console.log(error)
        return ({message: 'Failed to Update Invoice'});
    }
    
}

export async function createInvoice(prevState: State,formData : FormData){

    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status')
    });
    console.log(validatedFields);
    if(!validatedFields.success){
        return{
            errors: validatedFields.error.flatten().fieldErrors, message: 'Missing Fields Failed to Create Invoice'
        }
    }

    const {customerId, amount, status} = CreateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status')
    });
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0]; 
    console.log(customerId, amount, status);

    try {
        await sql `INSERT INTO invoices (customer_id, amount, status, date) VALUES (${customerId}, ${amountInCents}, ${status}, ${date})`;
        revalidatePath('/dashboard/invoices');
        redirect('/dashboard/invoices');
    } catch (error) {
        console.log(error);
        return ({message: 'Failed to Create Invoice'});
    }
   
    
}

export async function deleteInvoice(id: string){
    throw new Error('Failed to delete Invoice');
    try {
        await sql `DELETE FROM invoices WHERE id=${id}`;
        revalidatePath('/dashboard/invoices');
    } catch (error) {
        console.log(error);
        return ({message: 'Failed to delete Invoice'});
    }
    
}