import { useParams } from 'react-router-dom';
import RentalApplicationEditor from '../components/rental/RentalApplicationEditor';
import '../styles/RentalApplicationForm.css';

export default function AdminRentalApplicationForm() {
    const { id } = useParams();

    return <RentalApplicationEditor id={id} />;
}
