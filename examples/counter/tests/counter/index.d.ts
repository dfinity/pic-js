import { IDL } from '@dfinity/candid';
import { Actor } from '@hadronous/pic';
import { _SERVICE } from '../../declarations/counter.did';

export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: ({ IDL }: { IDL: IDL }) => IDL.Type[];

export declare type CounterService = _SERVICE;
export declare type CounterActor = Actor<CounterService>;
