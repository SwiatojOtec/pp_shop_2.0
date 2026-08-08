import { useParams } from 'react-router-dom';
import RentalApplicationEditor from '../components/rental/RentalApplicationEditor';
import '../../../pages/admin/Admin.css';
import '../styles/RentalApplicationForm.css';

export default function AdminRentalApplicationForm() {
    const { id } = useParams();

    return <RentalApplicationEditor id={id} />;
}
