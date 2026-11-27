import './style.css';
import './appearance.css';
import {initAppearance} from './appearance';
import { startAuth } from './auth';
initAppearance();
void startAuth();
